#!/usr/bin/env bash
#
# deploy-pages.sh — build the five games, assemble a static _site/, prove it
# carries no real names and no Life-OS references, then (with --publish) push it
# to the gh-pages branch for GitHub Pages.
#
#   bash scripts/deploy-pages.sh            # dry run: build + assemble + guards, STOP
#   bash scripts/deploy-pages.sh --publish  # everything above, then publish gh-pages
#
# Privacy contract (story 3d-upgrade/06):
#   - each <app>/src/profiles.local.ts (real first names, gitignored, LAN-only) is
#     quarantined BEFORE any build and restored on EXIT (even on failure/^C).
#   - the assembled site must contain zero 'dean|maren' and zero
#     'life-os|lifeos|laila|amptify' (binary-safe grep, sourcemaps included).
#
set -euo pipefail

# ---- real grep, never the interactive shell function -------------------------
GREP=/usr/bin/grep
[ -x "$GREP" ] || GREP="$(command -v grep)"

# ---- paths -------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SITE_DIR="$ROOT/_site"
APPS=(detective-academy world-explorer inventor-lab strategy-kingdom code-quest)
REPO_SLUG="cacardinal/kids-games-portfolio"
PAGES_URL="https://cacardinal.github.io/kids-games-portfolio/"

PUBLISH=0
[ "${1:-}" = "--publish" ] && PUBLISH=1

log()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
step() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[1;31mFAIL:\033[0m %s\n' "$*" >&2; exit 1; }

# ---- profiles.local.ts quarantine (with EXIT-trap restore) -------------------
QUAR_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kg-profiles-quar.XXXXXX")"
QUARANTINED=()   # parallel arrays: app name + whether we moved a file
declare -a MOVED_APPS=()

restore_profiles() {
  # Runs on EXIT (success, failure, or interrupt). Idempotent.
  local app src
  for app in "${MOVED_APPS[@]:-}"; do
    [ -n "$app" ] || continue
    src="$QUAR_DIR/$app.profiles.local.ts"
    if [ -f "$src" ]; then
      mv -f "$src" "$ROOT/$app/src/profiles.local.ts"
      step "restored $app/src/profiles.local.ts"
    fi
  done
  rmdir "$QUAR_DIR" 2>/dev/null || true
}
trap restore_profiles EXIT

log "Quarantining local profile overrides (real names) before build"
for app in "${APPS[@]}"; do
  f="$ROOT/$app/src/profiles.local.ts"
  if [ -f "$f" ]; then
    mv -f "$f" "$QUAR_DIR/$app.profiles.local.ts"
    MOVED_APPS+=("$app")
    step "quarantined $app/src/profiles.local.ts"
  else
    step "none for $app (using default Player One / Player Two / Guest)"
  fi
done

# ---- build all five ----------------------------------------------------------
log "Building ${#APPS[@]} apps (node_modules assumed installed; not touched)"
for app in "${APPS[@]}"; do
  step "build: $app"
  ( cd "$ROOT/$app" && npm run build ) \
    || die "build failed for $app"
done

# ---- assemble _site/ ---------------------------------------------------------
log "Assembling $SITE_DIR"
rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR/icons"

# launcher landing page at the root
cp "$ROOT/site/index.html" "$SITE_DIR/index.html"
step "root: site/index.html -> _site/index.html"

# each app's dist under /<app>/ + its icon under /icons/<app>.png
for app in "${APPS[@]}"; do
  [ -d "$ROOT/$app/dist" ] || die "missing $app/dist (build did not produce output)"
  mkdir -p "$SITE_DIR/$app"
  cp -R "$ROOT/$app/dist/." "$SITE_DIR/$app/"
  step "app:  $app/dist -> _site/$app/"
  if [ -f "$ROOT/$app/public/icon-512.png" ]; then
    cp "$ROOT/$app/public/icon-512.png" "$SITE_DIR/icons/$app.png"
    step "icon: $app/public/icon-512.png -> _site/icons/$app.png"
  else
    die "missing $app/public/icon-512.png (launcher card icon)"
  fi
done

# Jekyll off (so _-prefixed asset dirs are served verbatim)
touch "$SITE_DIR/.nojekyll"
step "wrote _site/.nojekyll"

# ---- HARD-FAIL privacy guards ------------------------------------------------
# grep returns 0 on a match; -a keeps it binary-safe so PNGs/sourcemaps are scanned.
#
# Names are matched as WHOLE WORDS (\b...\b), not bare substrings. A real leak
# surfaces as a token — "Dean" (string literal), .dean / dean_ (a save-key id) —
# and word boundaries still catch every such form. A plain substring match is
# unusable here: Three.js ships euclideanMo(dean)... i.e. euclideanModulo, whose
# "dean" tripped the guard in ALL five bundles (detective-academy has no local
# profile at all), which would block every deploy regardless of privacy state and
# make the guard meaningless. Word boundaries preserve the story's intent: catch
# the kids' real names, ignore library-code coincidences.
log "Guard 1/2: no real names (\\bdean\\b|\\bmaren\\b) anywhere in _site"
if MATCH=$("$GREP" -rlaiE '\b(dean|maren)\b' "$SITE_DIR" 2>/dev/null); then
  printf '%s\n' "$MATCH" | sed 's/^/      HIT: /' >&2
  die "real-name guard tripped — _site contains the name dean|maren (see files above)"
fi
step "clean — no dean|maren as a word"

log "Guard 2/2: no Life-OS references (life-os|lifeos|laila|amptify) in _site"
if MATCH=$("$GREP" -rlaiE 'life-os|lifeos|laila|amptify' "$SITE_DIR" 2>/dev/null); then
  printf '%s\n' "$MATCH" | sed 's/^/      HIT: /' >&2
  die "life-os guard tripped — _site contains a Life-OS reference (see files above)"
fi
step "clean — no life-os|lifeos|laila|amptify"

# ---- _site tree summary ------------------------------------------------------
log "Assembled site: $SITE_DIR"
step "total size: $(du -sh "$SITE_DIR" | cut -f1)"
step "root files: $(cd "$SITE_DIR" && ls -A | tr '\n' ' ')"
for app in "${APPS[@]}"; do
  size="$(du -sh "$SITE_DIR/$app" | cut -f1)"
  idx="missing"; [ -f "$SITE_DIR/$app/index.html" ] && idx="index.html present"
  step "$(printf '%-18s %6s   %s' "$app" "$size" "$idx")"
done

# ---- publish (guarded by --publish) ------------------------------------------
if [ "$PUBLISH" -ne 1 ]; then
  log "DRY RUN complete — guards green. Re-run with --publish to deploy gh-pages."
  exit 0
fi

log "Publishing _site/ to gh-pages (force-update: artifact branch)"
WT="$(mktemp -d "${TMPDIR:-/tmp}/kg-ghpages-wt.XXXXXX")"
rm -rf "$WT"   # git worktree add wants a non-existent path
cleanup_wt() { git -C "$ROOT" worktree remove --force "$WT" 2>/dev/null || rm -rf "$WT"; }

if git -C "$ROOT" show-ref --verify --quiet refs/heads/gh-pages; then
  step "gh-pages exists — checking it out in a worktree"
  git -C "$ROOT" worktree add "$WT" gh-pages
else
  step "gh-pages absent — creating orphan branch (git $(git --version | awk '{print $3}'))"
  git -C "$ROOT" worktree add --detach "$WT" HEAD
  ( cd "$WT" \
      && git checkout --orphan gh-pages \
      && git rm -rf . >/dev/null 2>&1 || true )
fi

step "syncing _site into worktree"
rsync -a --delete --exclude='.git' "$SITE_DIR"/ "$WT"/

( cd "$WT" \
    && git add -A \
    && if git diff --cached --quiet; then \
         echo "    no changes to publish"; \
       else \
         git commit -m "deploy: kids games portfolio $(date -u +%Y-%m-%dT%H:%MZ)" >/dev/null \
         && git push -f origin gh-pages; \
       fi )

cleanup_wt
log "Published. Live (after Pages build): $PAGES_URL"
log "If Pages is not enabled yet: gh api repos/$REPO_SLUG/pages -X POST -f 'source[branch]=gh-pages' -f 'source[path]=/'"
