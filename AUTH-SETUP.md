# Auth & Sync Setup — Kids Games Portfolio

Firebase project **`kids-games-portfolio`** backs cross-device save sync for the
five games. This file records what was provisioned via CLI and the one step that
must be done by hand in the console.

## Provisioned automatically (CLI) — done

- Project `kids-games-portfolio` created (`firebase projects:create`).
- Web app `kids-games-web` registered; its public web config lives in
  `site/firebase-config.js` (not a secret — see the note at the top of that file).
- Cloud Firestore provisioned: native mode, location `nam5`, free tier.
- `firestore.rules` deployed (`families/{uid}` readable/writable only by its owner).

## Manual step required — enable Email Link (passwordless) sign-in

Email-link sign-in could **not** be enabled non-interactively. The Identity
Toolkit Admin REST `PATCH .../config` returns `CONFIGURATION_NOT_FOUND` because a
brand-new Firebase project has no Auth config resource until the first provider is
enabled in the console, and the Identity Platform `initializeAuth` path is gated
behind billing (this project stays on the free Spark plan). Do this once by hand:

> **Firebase console → Authentication → Sign-in method → Email/Password → enable, then check "Email link (passwordless sign-in)" → Save.**

Direct link: https://console.firebase.google.com/project/kids-games-portfolio/authentication/providers

### Authorized domains for the magic-link redirect

Same console area, **Authentication → Settings → Authorized domains**. `localhost`
is present by default. Add the production origin:

> **Add domain → `cacardinal.github.io`**

(These live in the Auth config, which does not exist until the step above is done,
so they cannot be added via CLI beforehand either.)

## Local development & tests — the Firebase Emulator

All automated proof runs against the emulator; no real user data is ever created.

```bash
cd ~/Code/kids-games            # or the repo root

# One-shot: boot emulators, run the round-trip test, tear down.
firebase emulators:exec --only auth,firestore --project kids-games-portfolio \
  "node scripts/sync-emulator-test.mjs"

# Interactive: leave the emulators running (Auth :9099, Firestore :8099).
firebase emulators:start --only auth,firestore --project kids-games-portfolio
```

The emulator needs no credentials and no billing. The Auth emulator accepts
email-link sign-in regardless of the production provider toggle, which is why the
full round-trip can be proven before the manual console step is done.
