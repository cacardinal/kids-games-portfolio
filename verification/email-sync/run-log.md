# Email-Sync — Playwright Visual QA run-log

**Story:** `email-sync/04` — deploy wiring + emulator branch + visual QA
**Date:** 2026-07-15
**Environment:** Playwright MCP (Chromium, local), `_site/` served on `http://localhost:5190`
(`python3 -m http.server`), Firebase Auth+Firestore emulator (`firebase emulators:start
--only auth,firestore --project kids-games-portfolio`, Auth :9099 / Firestore :8099 per
`firebase.json`). kg-sync connects to the emulator via its localhost-only branch. No production
Firebase touched; no real user data.

## Verdicts

| Test | Verdict | Evidence |
|------|---------|----------|
| A. Signed-out local persistence | **PASS** | A1, A2 |
| B. Sign-in flow (magic link) | **PASS** | B1, B2, B3 |
| C. Cross-device sync round-trip | **PASS** (after fix — see below) | C1, C2, C3 |
| D. Fallback with kg-sync absent | **PASS** | D1, D2 |

## A — Signed-out local persistence
Detective Academy, signed out. Selected Player One, opened Case 1 (real play) → save
`kg.detective.v1.p1` written with `activeSession.caseId=1`, `startedAt=1784130787597`.
Reloaded the page: signed out (`kgSync.user()===null`), the save survived byte-for-byte
(same `startedAt`), and re-selecting Player One resumed directly into the in-progress Case 1.
kg-sync loaded but did not interfere with local play.
- `A1-signedout-case-inprogress.png` — Case 1 open before reload
- `A2-signedout-after-reload-resumed.png` — after reload, game resumed the same case

## B — Sign-in flow
Launcher account bar (signed out) → entered `family@example.com` → "Send sign-in link" →
status "Check your email for a sign-in link." Pulled the OOB magic link from the Auth emulator
REST API (`/emulator/v1/projects/kids-games-portfolio/oobCodes`), visited the launcher continue-URL
with the sign-in params → `completeLinkIfPresent()` returned true, URL sign-in params stripped,
account bar showed **"Synced as family@example.com"** with a Sign out button.
- `B1-launcher-signed-out.png` — account bar, signed out
- `B2-check-your-email.png` — "Check your email for a sign-in link."
- `B3-synced-as-signedin.png` — "Synced as family@example.com"

## C — Cross-device sync round-trip (the core proof)
Ran on a clean emulator with a fresh family (`parent@example.com`).
- **Device A:** clean storage → played Detective (opened Case 1, `startedAt=1784132399668`) →
  signed in via magic link → save pushed to Firestore. Verified in the emulator
  (`families/GWlvHhfTWWWmbnw2YOr0WSgbNvK1`, `saves: [kg.detective.v1.p1]`, cloud `startedAt=1784132399668`).
- **Device B:** wiped localStorage **and** IndexedDB (no local save, signed out, confirmed) →
  signed in as the same `parent@example.com` via a fresh magic link → the post-sign-in pull surfaced
  `kg.detective.v1.p1` into Device B's localStorage with the **exact** `startedAt=1784132399668`
  and `kg.sync.meta` persisted. Opening Detective → selecting Player One resumed directly into
  Device A's Case 1. Device B started empty, so the data could only have arrived via the cloud.
- `C1-deviceA-signedin-pushed.png` — Device A signed in, save pushed
- `C2-deviceB-signedin-synced.png` — Device B (fresh) signed in as same family
- `C3-deviceB-resumed-deviceA-case.png` — Device B resumed Device A's in-progress case

### Defect found and fixed during this QA (root cause below)
The first cross-device attempt FAILED: Device B signed in and its own Firebase session could read
the cloud doc, but kg-sync never wrote the pulled save into Device B's localStorage
(`kg.sync.meta` stayed null; no save surfaced). Root cause, confirmed live:

> kg-sync's "patch localStorage.setItem once" guard stored its markers **inside** the Storage
> object (`__kgSyncPatched`, `__kgSyncOriginalSetItem`) via `Object.defineProperty(..., {enumerable:false})`.
> On a **real browser Storage** object (unlike the Node test's plain-object shim) those markers are
> persisted as real string storage **entries** — `__kgSyncOriginalSetItem` becomes the string
> `"function () { [native code] }"`. On every page load *after the first*, kg-sync read
> `__kgSyncPatched === "true"`, took the already-patched branch, and set its internal
> `originalSetItem` to that **string**. `rawSet()` then called a string → threw → was swallowed →
> no local write. So `doPull`'s cloud-wins write and `writeMeta` silently no-opped on any 2nd+ page
> load — exactly the device-B receive path. The Node emulator test missed it because it uses a fresh
> plain-object storage per context, where `defineProperty({enumerable:false})` behaves correctly.

**Fix** (`fix(email-sync): patch-once via WeakMap…`, commit `8b786a3`): replaced the in-storage
markers with a module-level `WeakMap<storage, originalSetItem>` — fresh per JS context (every real
page load), still de-duped within one page. No markers are ever written into storage. Regression
Test 4 added to `scripts/sync-emulator-test.mjs` (fails on the old code, passes on the fix; full
suite `ALL PASS`). After redeploying `_site` with the fix, the cross-device round-trip above passed:
`kg.sync.meta` persists, zero leaked `__kgSync*` markers, and the save surfaces on Device B.

Known cosmetic residue (not blocking, not a sync-key so never synced): on some real-browser page
loads, `storage.setItem = fn` itself is coerced into a storage entry literally named `setItem`.
It does not affect sync correctness (the round-trip passes) but is worth a follow-up hardening.

## D — Fallback with kg-sync absent
Removed `_site/kg-sync.js` (the injected `<script src="../kg-sync.js">` 404s). Launcher: `window.kgSync`
is `undefined`, the account bar stayed hidden (`hidden=true`, `display:none`) and the games grid
rendered normally. Code Quest loaded, an operator could be selected, and the game wrote its own local
save (`kg.codequest.active`) — full play with no sync layer. Restored the file afterward.
- `D1-launcher-nosync-bar-hidden.png` — launcher, account bar hidden
- `D2-game-plays-without-sync.png` — Code Quest playable with kg-sync absent

## Notes
- The automatic (non-instrumented) sign-in completion via the launcher's `boot()` occasionally
  needed the SDK round-trip to settle; the final clean runs completed automatically (URL
  auto-stripped, bar updated) with no manual step.
- Deploy dry run (`bash scripts/deploy-pages.sh`, no `--publish`) passes both privacy guards with
  the module shipped; `_site/kg-sync.js` + `_site/firebase-config.js` present, all five game
  `index.html` carry the include exactly once.
