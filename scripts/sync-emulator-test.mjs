// Emulator test for the cross-device save-sync engine (site/kg-sync.js).
// Run under: firebase emulators:exec --only auth,firestore --project kids-games-portfolio \
//              "node scripts/sync-emulator-test.mjs"
//
// Drives the SAME logic the browser uses via dependency injection: npm `firebase`
// modules replace the CDN, jsdom provides window/localStorage/CustomEvent/location.
// Two independent contexts (A, B) point at one emulator project; a third (C) stays
// signed out. No CDN, no real network, no real user data.

import { JSDOM } from 'jsdom';
import * as fbApp from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import * as fbStore from 'firebase/firestore';
import { installKgSync } from '../site/kg-sync.js';

const PROJECT = 'kids-games-portfolio';

const fsHostPort = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [firestoreHost, firestorePortStr] = fsHostPort.split(':');
const firestorePort = Number(firestorePortStr);
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const authUrl = `http://${authHost}`;

let failures = 0;
function check(cond, msg) {
  if (cond) {
    console.log(`  ok   - ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL - ${msg}`);
  }
}
// Order-insensitive deep equal: Firestore returns map keys alphabetically sorted, so a
// game's {level,score} round-trips as {level,score} but re-serializes differently. We
// compare by value, not by key order.
function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') {
    const o = {};
    for (const k of Object.keys(x).sort()) o[k] = canon(x[k]);
    return o;
  }
  return x;
}
function deepEqual(a, b) {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// In-memory localStorage-like shim. A plain object so the engine's setItem monkey-patch
// installs (jsdom's Storage exotic object silently rejects both assignment and
// defineProperty on setItem; a real browser's own-property shadow works — jsdom is the
// outlier). The brief explicitly blesses a hand-rolled shim here.
function makeStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(String(k)) ? map.get(String(k)) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(String(k)); },
    clear() { map.clear(); },
    key(i) { return [...map.keys()][i] ?? null; },
    get length() { return map.size; },
  };
}

function makeLoadModules(spyState) {
  return async () => ({
    initializeApp: fbApp.initializeApp,
    getApp: fbApp.getApp,
    getAuth: fbAuth.getAuth,
    connectAuthEmulator: fbAuth.connectAuthEmulator,
    setPersistence: fbAuth.setPersistence,
    // Node/test path: in-memory persistence stands in for browserLocalPersistence.
    browserLocalPersistence: fbAuth.inMemoryPersistence,
    onAuthStateChanged: fbAuth.onAuthStateChanged,
    signOut: fbAuth.signOut,
    sendSignInLinkToEmail: fbAuth.sendSignInLinkToEmail,
    isSignInWithEmailLink: fbAuth.isSignInWithEmailLink,
    signInWithEmailLink: fbAuth.signInWithEmailLink,
    getFirestore: fbStore.getFirestore,
    connectFirestoreEmulator: fbStore.connectFirestoreEmulator,
    doc: fbStore.doc,
    getDoc: fbStore.getDoc,
    setDoc: spyState
      ? (...args) => {
          spyState.setDocCount++;
          return fbStore.setDoc(...args);
        }
      : fbStore.setDoc,
  });
}

// A storage shim that mimics a REAL browser Storage object's "legacy platform object"
// behavior: any property write — plain assignment OR Object.defineProperty — is coerced
// into a persisted STRING-valued entry, indistinguishable from one written via
// setItem(). This is exactly what live-browser QA proved: the (now-removed) old code's
// `Object.defineProperty(storage, '__kgSyncPatched', {value:true,...})` did not create a
// non-enumerable JS property on a real Storage; it created `getItem('__kgSyncPatched')
// === 'true'`, and the captured "original setter" marker persisted as a STRINGIFIED
// function, so the next install handed rawSet a string instead of a callable.
function makeRealishStorage() {
  const map = new Map();
  const own = {
    getItem(k) { return map.has(String(k)) ? map.get(String(k)) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(String(k)); },
    clear() { map.clear(); },
    key(i) { return [...map.keys()][i] ?? null; },
    get length() { return map.size; },
  };
  const ownNames = new Set(['getItem', 'setItem', 'removeItem', 'clear', 'key', 'length']);
  return new Proxy(own, {
    get(t, prop) {
      if (typeof prop === 'symbol' || ownNames.has(prop)) return t[prop];
      return map.has(String(prop)) ? map.get(String(prop)) : undefined;
    },
    set(t, prop, value) {
      if (typeof prop === 'symbol' || ownNames.has(prop)) { t[prop] = value; return true; }
      map.set(String(prop), String(value)); // coerced to a persisted string entry
      return true;
    },
    defineProperty(t, prop, desc) {
      if (typeof prop === 'symbol' || ownNames.has(prop)) return Reflect.defineProperty(t, prop, desc);
      map.set(String(prop), String(desc.value)); // same coercion a real Storage applies
      return true;
    },
    has(t, prop) {
      if (typeof prop === 'symbol' || ownNames.has(prop)) return true;
      return map.has(String(prop));
    },
  });
}

function makeContext({ appName, url = 'https://example.com/app/', debounceMs = 40, spyState, storage: storageOverride }) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url });
  const win = dom.window;
  const storage = storageOverride ?? makeStorage();
  const events = [];
  win.addEventListener('kg-sync:updated', (e) => events.push(e.detail && e.detail.key));
  const api = installKgSync({
    storage,
    root: win,
    loadModules: makeLoadModules(spyState),
    emulator: { authUrl, firestoreHost, firestorePort },
    installGlobal: true,
    debounceMs,
    appName,
  });
  return {
    dom,
    win,
    storage,
    api,
    events,
    setUrl: (u) => dom.reconfigure({ url: u }),
  };
}

async function getOobLink(email) {
  const res = await fetch(`http://${authHost}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const json = await res.json();
  const codes = (json.oobCodes || []).filter((c) => c.email === email);
  if (!codes.length) throw new Error('no oob code for ' + email);
  return codes[codes.length - 1].oobLink;
}

// Sign in a context via the real magic-link UX path against the Auth emulator.
async function signIn(ctx, email) {
  await ctx.api.sendLink(email);
  const link = await getOobLink(email);
  ctx.setUrl(link);
  const ok = await ctx.api.completeLinkIfPresent();
  if (!ok) throw new Error('magic-link sign-in failed for ' + email);
}

// Write a save AND pin an explicit updatedAt (so last-write-wins is provable by
// timestamp, independent of wall-clock arrival order). The value write marks the key
// dirty; overwriting kg.sync.meta pins the timestamp used on push.
function writeSaveWithTs(ctx, key, value, ts) {
  ctx.storage.setItem(key, JSON.stringify(value));
  const meta = JSON.parse(ctx.storage.getItem('kg.sync.meta') || '{}');
  meta[key] = ts;
  ctx.storage.setItem('kg.sync.meta', JSON.stringify(meta));
}

async function main() {
  const EMAIL = 'p1-tester@example.com';
  const KEY = 'kg.detective.v1.p1';
  const spyC = { setDocCount: 0 };

  // ---- Test 1: round-trip A -> cloud -> B ----
  console.log('Test 1: round-trip A -> cloud -> B');
  const A = makeContext({ appName: 'ctx-a' });
  const B = makeContext({ appName: 'ctx-b' });
  await A.api.ready;
  await B.api.ready;

  await signIn(A, EMAIL);
  check(!!A.api.user() && A.api.user().email === EMAIL, 'A is signed in as the tester email');

  const valueA = { level: 3, score: 120, tag: 'alpha' };
  A.storage.setItem(KEY, JSON.stringify(valueA));
  await A.api.syncNow();

  await signIn(B, EMAIL);
  check(!!B.api.user(), 'B is signed in');
  const bRaw = B.storage.getItem(KEY);
  check(bRaw != null && deepEqual(JSON.parse(bRaw), valueA), 'B localStorage equals what A wrote');
  check(B.events.includes(KEY), 'B fired kg-sync:updated for the key');

  // ---- Test 2: last-write-wins per key, resolved by updatedAt not arrival order ----
  console.log('Test 2: last-write-wins by updatedAt');
  const base = Date.now();

  // (a) A writes a NEWER value; assert it wins in both.
  const valueA2 = { level: 4, score: 200, tag: 'a-newer' };
  writeSaveWithTs(A, KEY, valueA2, base + 1000);
  await A.api.syncNow();
  await B.api.syncNow();
  check(deepEqual(JSON.parse(A.storage.getItem(KEY)), valueA2), 'A holds its newer value');
  check(deepEqual(JSON.parse(B.storage.getItem(KEY)), valueA2), 'B adopted A newer value');

  // (b) B writes an EVEN-NEWER value; assert it propagates back to A.
  const valueB3 = { level: 5, score: 300, tag: 'b-newest' };
  writeSaveWithTs(B, KEY, valueB3, base + 2000);
  await B.api.syncNow();
  await A.api.syncNow();
  check(deepEqual(JSON.parse(B.storage.getItem(KEY)), valueB3), 'B holds its newest value');
  check(deepEqual(JSON.parse(A.storage.getItem(KEY)), valueB3), 'B newest value propagated to A');

  // (c) Arrival-order independence: A writes a STALE value (older ts) and syncs LAST;
  //     it must LOSE to the newer cloud value, proving resolution is by updatedAt.
  const valueStale = { level: 1, score: 5, tag: 'stale-loser' };
  writeSaveWithTs(A, KEY, valueStale, base + 500);
  await A.api.syncNow();
  check(deepEqual(JSON.parse(A.storage.getItem(KEY)), valueB3), 'A stale later-write lost to newer cloud value');
  await B.api.syncNow();
  check(deepEqual(JSON.parse(B.storage.getItem(KEY)), valueB3), 'B still holds the newest value');

  // ---- Test 3: signed-out no-op ----
  console.log('Test 3: signed-out no-op');
  const C = makeContext({ appName: 'ctx-c', spyState: spyC });
  await C.api.ready;
  const guestKey = 'kg.explorer.v1.guest';
  const guestVal = { moves: 7 };
  C.storage.setItem(guestKey, JSON.stringify(guestVal));
  await delay(120); // past the debounce
  await C.api.syncNow();
  check(spyC.setDocCount === 0, 'no Firestore write happened while signed out');
  check(deepEqual(JSON.parse(C.storage.getItem(guestKey)), guestVal), 'local guest value untouched');
  check(C.api.user() === null, 'user() is null while signed out');

  // ready already resolved for C (awaited above); assert it stays resolved.
  let cReady = false;
  C.api.ready.then(() => { cReady = true; });
  await delay(0);
  check(cReady === true, 'ready resolved while signed out');

  // ---- Test 4: patch-once guard never persists storage markers (real-Storage regression) ----
  // Pins the fix: installKgSync must use a module-level WeakMap for the patch-once guard,
  // never in-storage markers. On a shim whose property writes coerce into persisted string
  // entries (matching a real browser Storage), the OLD marker-based guard would eventually
  // read a stringified "original setter" and break rawSet; the WeakMap fix never writes
  // storage entries for the guard at all, so no __kgSync* keys should ever appear, and a
  // cloud -> local pull (rawSet) must still land the value.
  console.log('Test 4: no __kgSync* markers on a real-Storage-like shim; rawSet still works');
  const EMAIL2 = 'p2-tester@example.com';
  const KEY2 = 'kg.explorer.v1.p2';
  const D = makeContext({ appName: 'ctx-d', storage: makeRealishStorage() });
  const E = makeContext({ appName: 'ctx-e', storage: makeRealishStorage() });
  await D.api.ready;
  await E.api.ready;

  function hasMarkerKeys(ctx) {
    const n = ctx.storage.length;
    for (let i = 0; i < n; i++) {
      const k = ctx.storage.key(i);
      if (typeof k === 'string' && k.startsWith('__kgSync')) return true;
    }
    return false;
  }

  check(!hasMarkerKeys(D), 'D storage has no __kgSync* marker entries right after install');
  check(!hasMarkerKeys(E), 'E storage has no __kgSync* marker entries right after install');

  await signIn(D, EMAIL2);
  const valueD = { level: 2, score: 50, tag: 'realish' };
  D.storage.setItem(KEY2, JSON.stringify(valueD));
  await D.api.syncNow();

  await signIn(E, EMAIL2);
  const eRaw = E.storage.getItem(KEY2);
  check(eRaw != null && deepEqual(JSON.parse(eRaw), valueD),
    'E localStorage equals what D wrote, on the real-Storage-like shim (rawSet works)');
  check(!hasMarkerKeys(D), 'D storage still has no __kgSync* marker entries after a sync round-trip');
  check(!hasMarkerKeys(E), 'E storage still has no __kgSync* marker entries after a sync round-trip');

  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log('\nALL PASS');
  process.exit(0);
}

main().catch((err) => {
  console.error('UNCAUGHT ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
