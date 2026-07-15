// kg-sync.js — cross-device save-sync engine for the Kids Games Portfolio.
//
// Framework-agnostic ES module. Games keep persisting per profile via
// localStorage.setItem(key, JSON.stringify(value)); this engine mirrors those saves
// to Firestore (families/{uid}) when the family is signed in, and merges cloud saves
// back down on sign-in. It never parses game internals — it is generic over kg.* keys.
//
// Fail-open by design: any Firebase problem (offline, SDK load failure, rules deny) is
// caught and warned; games keep working purely on localStorage. Nothing ever throws
// into the page.
//
// Testability: installKgSync(opts) takes injectable dependencies so the Node emulator
// test drives the SAME logic without a real browser or the CDN.

import { firebaseConfig } from './firebase-config.js';

const PENDING_EMAIL_KEY = 'kg.sync.pendingEmail';
const META_KEY = 'kg.sync.meta';

// A kg.* save key we mirror. kg.sync.* keys are engine-internal and NEVER synced.
function isSyncKey(key) {
  return typeof key === 'string' && key.startsWith('kg.') && !key.startsWith('kg.sync.');
}

// Browser default: pull the pinned Firebase SDK (v10.14.1) off the gstatic CDN.
async function defaultLoadModules() {
  const V = '10.14.1';
  const [app, auth, store] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  return {
    initializeApp: app.initializeApp,
    getApp: app.getApp,
    getAuth: auth.getAuth,
    connectAuthEmulator: auth.connectAuthEmulator,
    setPersistence: auth.setPersistence,
    browserLocalPersistence: auth.browserLocalPersistence,
    onAuthStateChanged: auth.onAuthStateChanged,
    signOut: auth.signOut,
    sendSignInLinkToEmail: auth.sendSignInLinkToEmail,
    isSignInWithEmailLink: auth.isSignInWithEmailLink,
    signInWithEmailLink: auth.signInWithEmailLink,
    getFirestore: store.getFirestore,
    connectFirestoreEmulator: store.connectFirestoreEmulator,
    doc: store.doc,
    getDoc: store.getDoc,
    setDoc: store.setDoc,
  };
}

export function installKgSync(opts = {}) {
  const config = opts.config ?? firebaseConfig;
  const storage = opts.storage ?? globalThis.localStorage;
  const root = opts.root ?? (globalThis.window ?? globalThis);
  const loadModules = opts.loadModules ?? defaultLoadModules;
  const emulator = opts.emulator ?? null;
  const installGlobal = opts.installGlobal ?? true;
  const debounceMs = opts.debounceMs ?? 1500;
  const appName = opts.appName ?? '[DEFAULT]';

  // ---- engine state ----
  let mods = null;
  let auth = null;
  let db = null;
  let currentUser = null;
  const dirty = new Set();
  let debounceTimer = null;
  const authCallbacks = new Set();
  let firstAuthHandled = false;
  let pullChain = Promise.resolve();

  let resolveReady;
  const ready = new Promise((res) => { resolveReady = res; });
  let readyResolved = false;
  const markReady = () => { if (!readyResolved) { readyResolved = true; resolveReady(); } };

  // ---- storage monkey-patch (once per storage object) ----
  // The wrapper ALWAYS calls the original first, then dirties matching keys. Capturing
  // is a harmless no-op beyond the original setter when signed out / Firebase absent.
  let originalSetItem;
  if (storage.__kgSyncPatched) {
    originalSetItem = storage.__kgSyncOriginalSetItem;
  } else {
    originalSetItem = storage.setItem.bind(storage);
    try {
      Object.defineProperty(storage, '__kgSyncOriginalSetItem', {
        value: originalSetItem, enumerable: false, writable: false, configurable: true,
      });
      Object.defineProperty(storage, '__kgSyncPatched', {
        value: true, enumerable: false, writable: true, configurable: true,
      });
    } catch {
      storage.__kgSyncOriginalSetItem = originalSetItem;
      storage.__kgSyncPatched = true;
    }
    storage.setItem = function (key, value) {
      originalSetItem(key, value); // games must never break
      try {
        if (isSyncKey(key)) markDirty(key, Date.now());
      } catch { /* never throw into the page */ }
    };
  }

  function rawSet(key, value) {
    // write bypassing the patch so we never re-dirty (used for pulls + meta).
    try { originalSetItem(key, value); } catch { /* ignore */ }
  }

  // ---- per-key timestamp meta (survives reloads) ----
  function readMeta() {
    try { return JSON.parse(storage.getItem(META_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function writeMeta(m) {
    try { rawSet(META_KEY, JSON.stringify(m)); } catch { /* ignore */ }
  }

  function allLocalSyncKeys() {
    const out = [];
    try {
      const n = storage.length;
      for (let i = 0; i < n; i++) {
        const k = storage.key(i);
        if (isSyncKey(k)) out.push(k);
      }
    } catch { /* ignore */ }
    return out;
  }

  function markDirty(key, ts) {
    const meta = readMeta();
    meta[key] = ts;
    writeMeta(meta);
    dirty.add(key);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (debounceTimer) { try { clearTimeout(debounceTimer); } catch { /* ignore */ } }
    debounceTimer = setTimeout(() => { debounceTimer = null; flush(); }, debounceMs);
  }

  function publicUser() {
    return currentUser ? { email: currentUser.email ?? null } : null;
  }

  function dispatchUpdated(key) {
    try {
      const CE = root.CustomEvent || globalThis.CustomEvent;
      if (CE && typeof root.dispatchEvent === 'function') {
        root.dispatchEvent(new CE('kg-sync:updated', { detail: { key } }));
      }
    } catch { /* ignore */ }
  }

  function notifyAuth() {
    const u = publicUser();
    for (const cb of authCallbacks) {
      try { cb(u); } catch { /* ignore */ }
    }
  }

  // ---- push (debounced flush of dirty keys) ----
  async function flush() {
    if (!auth || !db || !currentUser || !mods || dirty.size === 0) return;
    const keys = [...dirty];
    dirty.clear();
    try {
      const meta = readMeta();
      const saves = {};
      for (const key of keys) {
        const rawVal = storage.getItem(key);
        if (rawVal == null) continue;
        let data;
        try { data = JSON.parse(rawVal); } catch { data = rawVal; }
        saves[key] = { data, updatedAt: meta[key] ?? Date.now() };
      }
      const ref = mods.doc(db, 'families', currentUser.uid);
      await mods.setDoc(
        ref,
        { email: currentUser.email ?? null, updatedAt: Date.now(), saves },
        { merge: true },
      );
    } catch (e) {
      console.warn('[kg-sync] push failed:', (e && e.message) || e);
      for (const k of keys) dirty.add(k); // re-queue
      scheduleFlush(); // ...and actually arm a retry (fail-open, never drop a save)
    }
  }

  // ---- pull + merge (serialized) ----
  function pull() {
    pullChain = pullChain.then(doPull, doPull);
    return pullChain;
  }
  async function doPull() {
    if (!auth || !db || !currentUser || !mods) return;
    try {
      const ref = mods.doc(db, 'families', currentUser.uid);
      const snap = await mods.getDoc(ref);
      const cloud = snap && snap.exists && snap.exists() ? (snap.data() || {}) : {};
      const cloudSaves = cloud.saves || {};
      const meta = readMeta();

      const keys = new Set([...allLocalSyncKeys(), ...Object.keys(cloudSaves)]);
      let changed = false;

      for (const key of keys) {
        if (!isSyncKey(key)) continue; // union only; never delete either side
        const cloudEntry = cloudSaves[key];
        const localRaw = storage.getItem(key);
        const localTs = meta[key]; // may be undefined => no known local timestamp

        if (cloudEntry && typeof cloudEntry.updatedAt === 'number') {
          const cloudTs = cloudEntry.updatedAt;
          // Local wins only if we KNOW its timestamp and it is strictly newer.
          const localIsNewer = localTs != null && localTs > cloudTs;
          if (localIsNewer) {
            dirty.add(key); // push our newer value up
          } else {
            // Cloud wins (cloud newer, or we have no local timestamp).
            dirty.delete(key); // local is being replaced by cloud; nothing to push
            const newVal = JSON.stringify(cloudEntry.data);
            if (localRaw !== newVal) {
              rawSet(key, newVal); // original setter — do not re-dirty
              meta[key] = cloudTs;
              changed = true;
              dispatchUpdated(key);
            } else if (localTs == null || cloudTs > localTs) {
              meta[key] = cloudTs; // values already equal; adopt the timestamp
              changed = true;
            }
          }
        } else if (localRaw != null) {
          // Key absent in cloud — keep local and push it up.
          dirty.add(key);
        }
      }
      if (changed) writeMeta(meta);
      if (dirty.size) scheduleFlush();
    } catch (e) {
      console.warn('[kg-sync] pull failed:', (e && e.message) || e);
    }
  }

  // ---- boot: load SDK, wire auth, resolve ready ----
  (async function boot() {
    try {
      mods = await loadModules();
      let app;
      try { app = mods.getApp(appName); }
      catch { app = mods.initializeApp(config, appName); }

      auth = mods.getAuth(app);
      if (emulator && emulator.authUrl) {
        try { mods.connectAuthEmulator(auth, emulator.authUrl, { disableWarnings: true }); }
        catch { /* already connected */ }
      }
      try { await mods.setPersistence(auth, mods.browserLocalPersistence); }
      catch (e) { console.warn('[kg-sync] setPersistence failed:', (e && e.message) || e); }

      db = mods.getFirestore(app);
      if (emulator && emulator.firestoreHost) {
        try { mods.connectFirestoreEmulator(db, emulator.firestoreHost, emulator.firestorePort); }
        catch { /* already connected */ }
      }

      mods.onAuthStateChanged(auth, async (user) => {
        currentUser = user || null;
        notifyAuth();
        if (currentUser) {
          try { await pull(); } catch { /* fail-open */ }
        }
        firstAuthHandled = true;
        markReady();
      });
    } catch (e) {
      // SDK failed to load / init: degrade to safe no-ops but keep the API present.
      console.warn('[kg-sync] Firebase unavailable, running local-only:', (e && e.message) || e);
      auth = null; db = null; currentUser = null;
      firstAuthHandled = true;
      notifyAuth();   // fire cb(null) once for any already-registered listener
      markReady();
    }
  })();

  // ---- public API ----
  const api = {
    ready,
    user() { return publicUser(); },
    onAuthChange(cb) {
      if (typeof cb !== 'function') return () => {};
      authCallbacks.add(cb);
      if (firstAuthHandled) { try { cb(publicUser()); } catch { /* ignore */ } }
      return () => { authCallbacks.delete(cb); };
    },
    async sendLink(email) {
      // Store the pending email regardless, so completeLinkIfPresent can recover it.
      try { rawSet(PENDING_EMAIL_KEY, email); } catch { /* ignore */ }
      if (!auth || !mods) return;
      try {
        const loc = root.location || {};
        const url = (loc.origin || '') + (loc.pathname || '');
        await mods.sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
      } catch (e) {
        console.warn('[kg-sync] sendLink failed:', (e && e.message) || e);
      }
    },
    async completeLinkIfPresent() {
      if (!auth || !mods) return false;
      try {
        const href = (root.location && root.location.href) || '';
        if (!mods.isSignInWithEmailLink(auth, href)) return false;
        let email = null;
        try { email = storage.getItem(PENDING_EMAIL_KEY); } catch { /* ignore */ }
        if (!email && typeof api.promptForEmail === 'function') {
          email = await api.promptForEmail();
        }
        if (!email) return false;
        const cred = await mods.signInWithEmailLink(auth, email, href);
        try { storage.removeItem && storage.removeItem(PENDING_EMAIL_KEY); } catch { /* ignore */ }
        // Strip the sign-in params from the URL.
        try {
          if (root.history && typeof root.history.replaceState === 'function') {
            const title = (root.document && root.document.title) || '';
            root.history.replaceState({}, title, (root.location && root.location.pathname) || '/');
          }
        } catch { /* ignore */ }
        currentUser = (cred && cred.user) || currentUser;
        await pull(); // ensure the first pull completed before we return
        return !!currentUser;
      } catch (e) {
        console.warn('[kg-sync] completeLinkIfPresent failed:', (e && e.message) || e);
        return false;
      }
    },
    async signOut() {
      if (!auth || !mods) return;
      try { await mods.signOut(auth); }
      catch (e) { console.warn('[kg-sync] signOut failed:', (e && e.message) || e); }
    },
    async syncNow() {
      if (!auth || !db || !currentUser || !mods) return; // signed-out => no-op
      await pull();
      await flush();
    },
  };

  if (installGlobal) {
    try { root.kgSync = api; } catch { /* ignore */ }
  }
  return api;
}

// Auto-install for a real browser (never in the Node test — no global window there).
if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
  // Localhost/127.0.0.1 (exact hostname match only — no substring/endsWith/NODE_ENV/port
  // checks) connects to the local Firebase emulator (ports pinned in firebase.json:
  // auth 9099, firestore 8099). Every other hostname, including production
  // (cacardinal.github.io) and any LAN IP, is untouched and talks to real Firebase.
  const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1'];
  if (LOCAL_HOSTNAMES.includes(window.location.hostname)) {
    installKgSync({
      emulator: {
        authUrl: 'http://localhost:9099',
        firestoreHost: 'localhost',
        firestorePort: 8099,
      },
    });
  } else {
    installKgSync();
  }
}
