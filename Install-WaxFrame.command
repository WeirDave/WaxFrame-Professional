#!/usr/bin/env bash
# Install-WaxFrame.command
#
# One-command install for WaxFrame Professional on Mac and Linux -- the
# counterpart to Install-WaxFrame.ps1 (Windows):
#
#   curl -fsSL https://raw.githubusercontent.com/WeirDave/WaxFrame-Professional/main/Install-WaxFrame.command | bash
#
# WaxFrame runs as local files -- there is no server and no build step -- so
# installing means putting the folder somewhere and opening index.html. Your
# licence is separate from the app: buy it once at weirdave.gumroad.com and
# enter the key in the app. This script only fetches the app itself.
#
# Two ways to get it, and it asks which on a fresh install:
#
#   Git  - a tracked checkout. Updating later fetches a few KB and checks out
#          the new tag, so it takes seconds.
#   ZIP  - no dependencies. Updating re-downloads the whole app and verifies
#          its SHA-256. When the GitHub CLI (gh) is installed, the release's
#          build-provenance attestation is verified too and a failed check
#          refuses the download; without gh the SHA-256 and the
#          `gh attestation verify` command are printed.
#
# Unlike Windows -- where `winget install Git.Git` is quick enough to run as
# part of this flow -- the Mac routes (xcode-select, Homebrew) are slow and
# intrusive, so a missing git is explained rather than installed.
#
# Either way, Update-WaxFrame.command in the installed folder handles updates
# from then on and picks the right mechanism automatically. Nothing here is
# WaxFrame-version-specific: the newest release is resolved at runtime.
#
# The whole script body lives in main(), called on the last line. This script
# is run as `curl ... | bash`, which executes it while it streams in: a
# download cut off halfway would otherwise run the part that arrived. A
# truncated file never reaches the last line, so nothing in main() runs.

set -euo pipefail

REPO="WeirDave/WaxFrame-Professional"
CLONE_URL="https://github.com/$REPO.git"
API_LATEST="https://api.github.com/repos/$REPO/releases/latest"

# Used by the EXIT trap, so they live at script scope.
TARGET=""
STAGING=""
EXTRACT=""
CREATED_TARGET=0
CLEANUP_TARGET=0

log_step() { printf '\033[36m%s\033[0m\n' "$1"; }
log_ok()   { printf '\033[32m%s\033[0m\n' "$1"; }
log_warn() { printf '\033[33m%s\033[0m\n' "$1"; }
log_err()  { printf '\033[31m%s\033[0m\n' "$1" >&2; }

have_git() { command -v git >/dev/null 2>&1; }

json_field() {
  printf '%s' "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/'
}

get_wf_version() {
  local vfile="$1/js/version.js"
  [ -f "$vfile" ] || return 1
  grep -o "APP_VERSION = 'v\?[0-9.]* Pro'" "$vfile" | head -1 \
    | sed -E "s/.*'v?([0-9.]*) Pro'.*/\1/"
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print tolower($1)}'
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print tolower($1)}'
  else return 1
  fi
}

# ---- Download safety helpers ------------------------------------------------
# Kept identical in Update-WaxFrame.command.

# The SHA-256 sidecar is published in the same release as the ZIP, so on its
# own it only proves the download was not corrupted. When the GitHub CLI is
# installed, also check the build-provenance attestation the release workflow
# signs. A failed check refuses the download. Without gh the checksum still
# stands, and the exact command is printed so it can be run by hand.
# $1 = zip, $2 = asset name, $3 = SHA-256. Returns 1 to refuse.
confirm_attestation() {
  local out
  if ! command -v gh >/dev/null 2>&1; then
    log_warn "GitHub CLI (gh) not found -- build provenance was not checked, only the SHA-256."
    log_warn "  SHA-256 of $2 : $3"
    log_warn "  To verify it independently: gh attestation verify $2 --repo $REPO"
    return 0
  fi
  if out="$(gh attestation verify "$1" --repo "$REPO" 2>&1)"; then
    log_ok "Build provenance verified (gh attestation)."
    return 0
  fi
  # gh needs a login to fetch attestations. Not logged in is "could not
  # check", not "checked and failed", so behave as if gh were absent.
  if ! gh auth status >/dev/null 2>&1; then
    log_warn "GitHub CLI is installed but not signed in, so build provenance was not checked."
    log_warn "  SHA-256 of $2 : $3"
    log_warn "  After 'gh auth login': gh attestation verify $2 --repo $REPO"
    return 0
  fi
  log_err "Build provenance check failed (gh attestation verify) -- the download was not used."
  printf '%s\n' "$out" >&2
  return 1
}

# Refuse an archive before extracting any of it: no entry may climb out of the
# destination ('..' segments), be absolute, carry a backslash or drive letter,
# or be a symbolic link (mode column of `unzip -Z` starting with "l").
# $1 = zip. Returns 1 to refuse.
check_zip_entries() {
  local names modes bad
  if ! names="$(unzip -Z1 "$1" 2>/dev/null)" || ! modes="$(unzip -Z "$1" 2>/dev/null)"; then
    log_err "Release ZIP could not be listed, so its contents cannot be checked."
    return 1
  fi
  bad="$(printf '%s\n' "$names" | grep -E '(^|/)\.\.(/|$)|^/|\\|^[A-Za-z]:' | head -1 || true)"
  if [ -n "$bad" ]; then log_err "Release archive contains an unsafe path: $bad"; return 1; fi
  bad="$(printf '%s\n' "$modes" | grep -E '^l' | head -1 || true)"
  if [ -n "$bad" ]; then log_err "Release archive contains a symbolic link: $bad"; return 1; fi
  return 0
}

# After extraction: the root must still sit under the staging folder and the
# tree must hold no symlinks. $1 = root, $2 = staging.
check_extracted_safe() {
  local root stage
  root="$(cd "$1" && pwd -P)" || return 1
  stage="$(cd "$2" && pwd -P)" || return 1
  case "$root/" in
    "$stage"/*) ;;
    *) log_err "Extracted release root is outside the staging folder: $root"; return 1 ;;
  esac
  if [ -n "$(find "$root" -type l 2>/dev/null | head -1)" ]; then
    log_err "Extracted release contains a symbolic link."
    return 1
  fi
}

# Runs on every exit. Removes the staging folders, and -- only while an install
# is in flight and only if this run created it -- the target folder, so a failed
# clone or copy never leaves a half-made WaxFrame folder behind. A folder that
# was already there is never deleted.
cleanup() {
  [ -n "$STAGING" ] && rm -rf "$STAGING"
  [ -n "$EXTRACT" ] && rm -rf "$EXTRACT"
  if [ "$CLEANUP_TARGET" = "1" ] && [ "$CREATED_TARGET" = "1" ] && [ -n "$TARGET" ]; then
    rm -rf "$TARGET"
  fi
  return 0
}

# The menu goes to stderr so the chosen value is the only thing on stdout.
choose_method() {
  {
    echo
    echo "  How would you like to install WaxFrame?"
    echo
    if have_git; then
      echo "    [1] Git  - tracked checkout, updates take seconds. Git is installed."
    else
      echo "    [1] Git  - tracked checkout, updates take seconds. Needs git first:"
      if [ "$(uname -s)" = "Darwin" ]; then
        echo "             xcode-select --install   (or: brew install git)"
      else
        echo "             install git with your package manager"
      fi
    fi
    echo "    [2] ZIP  - no dependencies, each update re-downloads the app."
    echo
  } >&2
  while :; do
    printf 'Choose 1 or 2 [1] ' >&2
    read -r choice || choice=""
    case "$choice" in
      ''|1) echo "git"; return ;;
      2)    echo "zip"; return ;;
      *)    log_warn "  Enter 1 or 2." ;;
    esac
  done
}

main() {
  local METHOD="ask" NO_LAUNCH=0
  local TAG VERSION RELEASE_JSON ASSET BASE EXPECTED ACTUAL TREE KIDS ONLY FILES_AT_ROOT d TREE_VERSION

  while [ $# -gt 0 ]; do
    case "$1" in
      --path)      TARGET="${2:-}"; shift 2 ;;
      --method)    METHOD="${2:-ask}"; shift 2 ;;
      --no-launch) NO_LAUNCH=1; shift ;;
      *) shift ;;
    esac
  done

  [ -n "$TARGET" ] || TARGET="$HOME/Applications/WaxFrame Professional"

  if [ -f "$TARGET/index.html" ]; then
    log_warn "WaxFrame is already installed at:"
    log_warn "  $TARGET"
    log_warn "Run Update-WaxFrame.command inside that folder to update it."
    exit 0
  fi
  # Only a folder this run creates may be removed again if the install fails.
  [ -e "$TARGET" ] || CREATED_TARGET=1
  trap cleanup EXIT

  echo
  log_step "WaxFrame Professional"
  echo "  Installing to: $TARGET"
  echo

  if [ "$METHOD" = "ask" ]; then
    if [ -t 0 ]; then METHOD="$(choose_method)"; else METHOD=$(have_git && echo git || echo zip); fi
  fi

  if [ "$METHOD" = "git" ] && ! have_git; then
    log_warn "Git isn't installed, so falling back to the ZIP method."
    if [ "$(uname -s)" = "Darwin" ]; then
      log_warn "Install it with 'xcode-select --install' or 'brew install git' to"
      log_warn "get incremental updates next time."
    else
      log_warn "Install git with your package manager to get incremental updates."
    fi
    METHOD="zip"
  fi

  CLEANUP_TARGET=1
  if [ "$METHOD" = "git" ]; then
    log_step "Cloning $REPO…"
    mkdir -p "$TARGET"
    git clone --quiet -- "$CLONE_URL" "$TARGET" \
      || { log_err "Clone failed. Check your network or proxy settings."; exit 1; }
    # Land on the newest release rather than whatever main happens to be.
    TAG="$(git -C "$TARGET" tag --list 'v*' | grep -E '^v[0-9]+(\.[0-9]+)+$' \
          | sort -t. -k1.2,1n -k2,2n -k3,3n -k4,4n -k5,5n | tail -1 || true)"
    # No release tag, or a tag that cannot be checked out, is an error: the
    # alternative is a folder sitting on main, which is unreleased code.
    if [ -z "$TAG" ]; then
      log_err "No release tag was found in the repository, so nothing was installed."
      exit 1
    fi
    log_step "Checking out $TAG…"
    git -C "$TARGET" -c advice.detachedHead=false checkout --force "$TAG" >/dev/null 2>&1 \
      || { log_err "Could not check out $TAG, so nothing was installed."; exit 1; }
  else
    log_step "Finding the latest release…"
    RELEASE_JSON="$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API_LATEST")" \
      || { log_err "Could not reach GitHub."; exit 1; }
    TAG="$(json_field "$RELEASE_JSON" tag_name)"
    # The full shape, as the other scripts check it: the tag goes into URLs and
    # a file name, so a loose glob is not enough.
    if ! printf '%s' "$TAG" | grep -Eq '^v[0-9]+(\.[0-9]+)+$'; then
      log_err "GitHub returned an unexpected release tag: ${TAG:-(none)}"; exit 1
    fi
    VERSION="${TAG#v}"

    ASSET="WaxFrame-Professional-$VERSION.zip"
    BASE="https://github.com/$REPO/releases/download/$TAG"

    # The ZIP is built beside the target and renamed into place, which cannot
    # merge into a populated folder, so an existing one must be empty.
    if [ -d "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
      log_err "$TARGET already exists and is not empty. Choose another folder with --path."
      exit 1
    fi

    STAGING="$(mktemp -d "${TMPDIR:-/tmp}/WaxFrameInstall.XXXXXX")"
    # Extracted NEXT TO the target, so the final step is a same-filesystem
    # rename. Copying the files into place would leave a partial app
    # (index.html present, the rest missing) if it died halfway.
    mkdir -p "$(dirname "$TARGET")"
    EXTRACT="$(mktemp -d "$TARGET.incoming.XXXXXX")" \
      || { log_err "Could not create a staging folder next to $TARGET."; exit 1; }

    log_step "Downloading $TAG…"
    curl -fsSL -o "$STAGING/waxframe.zip" "$BASE/$ASSET" \
      || { log_err "Release download failed."; exit 1; }

    # The checksum is required, not best-effort. A release with none published
    # cannot be verified, and anyone able to serve a malicious ZIP simply does
    # not publish a correct hash beside it.
    #
    # Fetched as its own statement rather than as an `if` condition,
    # deliberately: as the condition, a dropped connection and a genuinely
    # absent checksum took the same branch, so a flaky network silently
    # skipped verification too.
    if ! curl -fsSL -o "$STAGING/waxframe.sha256" "$BASE/$ASSET.sha256"; then
      log_err "Could not fetch $ASSET.sha256, so the download cannot be verified. Nothing was installed."
      log_err "If the release is incomplete, see https://github.com/$REPO/releases"
      exit 1
    fi

    log_step "Verifying SHA-256…"
    EXPECTED="$(awk 'NR==1 && $1 ~ /^[0-9A-Fa-f]{64}$/ { print tolower($1) }' "$STAGING/waxframe.sha256")"
    if [ -z "$EXPECTED" ]; then log_err "Checksum file is malformed. Nothing was installed."; exit 1; fi
    if ! ACTUAL="$(sha256_of "$STAGING/waxframe.zip")"; then log_err "No SHA-256 tool available."; exit 1; fi
    if [ "$ACTUAL" != "$EXPECTED" ]; then
      log_err "SHA-256 mismatch — expected $EXPECTED, got $ACTUAL. The download was not used."
      exit 1
    fi
    log_ok "  Verified $ACTUAL"
    confirm_attestation "$STAGING/waxframe.zip" "$ASSET" "$ACTUAL" || exit 1

    log_step "Extracting…"
    check_zip_entries "$STAGING/waxframe.zip" || exit 1
    unzip -q "$STAGING/waxframe.zip" -d "$EXTRACT" \
      || { log_err "The downloaded release is not a valid ZIP."; exit 1; }

    TREE="$EXTRACT"
    KIDS=0; ONLY=""
    for d in "$TREE"/*/; do [ -d "$d" ] && { KIDS=$((KIDS+1)); ONLY="${d%/}"; }; done
    FILES_AT_ROOT="$(find "$TREE" -maxdepth 1 -type f | wc -l | tr -d ' ')"
    if [ "$KIDS" -eq 1 ] && [ "$FILES_AT_ROOT" -eq 0 ]; then TREE="$ONLY"; fi
    check_extracted_safe "$TREE" "$EXTRACT" || exit 1

    [ -f "$TREE/index.html" ] \
      || { log_err "The downloaded release does not look like a WaxFrame folder (no index.html)."; exit 1; }
    # The updaters make the same check: the bytes must be the release asked for.
    TREE_VERSION="$(get_wf_version "$TREE" || true)"
    if [ "$TREE_VERSION" != "$VERSION" ]; then
      log_err "Downloaded release version mismatch: expected $VERSION, found ${TREE_VERSION:-(none)}"
      exit 1
    fi

    [ -d "$TARGET" ] && rmdir "$TARGET"   # empty, checked above
    mv "$TREE" "$TARGET"
    chmod +x "$TARGET/Update-WaxFrame.command" 2>/dev/null || true
  fi
  CLEANUP_TARGET=0

  INSTALLED="$(get_wf_version "$TARGET" || true)"
  echo
  if [ -n "$INSTALLED" ]; then log_ok "Installed WaxFrame v$INSTALLED"; else log_ok "Installed WaxFrame"; fi
  echo "  $TARGET"
  echo
  echo "  Open index.html to start. Update later with Update-WaxFrame.command"
  echo "  in that folder. Enter your licence key in the app itself."
  echo

  if [ "$NO_LAUNCH" -eq 0 ]; then
    if command -v open >/dev/null 2>&1; then
      open "$TARGET/index.html"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$TARGET/index.html"
    fi
  fi
}

main "$@"
