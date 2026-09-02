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
#          its SHA-256.
#
# Unlike Windows -- where `winget install Git.Git` is quick enough to run as
# part of this flow -- the Mac routes (xcode-select, Homebrew) are slow and
# intrusive, so a missing git is explained rather than installed.
#
# Either way, Update-WaxFrame.command in the installed folder handles updates
# from then on and picks the right mechanism automatically. Nothing here is
# WaxFrame-version-specific: the newest release is resolved at runtime.

set -euo pipefail

REPO="WeirDave/WaxFrame-Professional"
CLONE_URL="https://github.com/$REPO.git"
API_LATEST="https://api.github.com/repos/$REPO/releases/latest"

TARGET=""
METHOD="ask"
NO_LAUNCH=0

while [ $# -gt 0 ]; do
  case "$1" in
    --path)      TARGET="${2:-}"; shift 2 ;;
    --method)    METHOD="${2:-ask}"; shift 2 ;;
    --no-launch) NO_LAUNCH=1; shift ;;
    *) shift ;;
  esac
done

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

[ -n "$TARGET" ] || TARGET="$HOME/Applications/WaxFrame Professional"

if [ -f "$TARGET/index.html" ]; then
  log_warn "WaxFrame is already installed at:"
  log_warn "  $TARGET"
  log_warn "Run Update-WaxFrame.command inside that folder to update it."
  exit 0
fi

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

if [ "$METHOD" = "git" ]; then
  log_step "Cloning $REPO…"
  mkdir -p "$TARGET"
  git clone --quiet "$CLONE_URL" "$TARGET"
  # Land on the newest release rather than whatever main happens to be.
  TAG="$(git -C "$TARGET" tag --list 'v*' | grep -E '^v[0-9]+(\.[0-9]+)+$' \
        | sort -t. -k1.2,1n -k2,2n -k3,3n | tail -1 || true)"
  if [ -n "$TAG" ]; then
    log_step "Checking out $TAG…"
    git -C "$TARGET" -c advice.detachedHead=false checkout --force "$TAG" >/dev/null 2>&1
  fi
else
  log_step "Finding the latest release…"
  RELEASE_JSON="$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API_LATEST")" \
    || { log_err "Could not reach GitHub."; exit 1; }
  TAG="$(json_field "$RELEASE_JSON" tag_name)"
  case "$TAG" in
    v[0-9]*) ;;
    *) log_err "GitHub returned an unexpected release tag: ${TAG:-(none)}"; exit 1 ;;
  esac
  VERSION="${TAG#v}"

  ASSET="WaxFrame-Professional-$VERSION.zip"
  BASE="https://github.com/$REPO/releases/download/$TAG"
  STAGING="$(mktemp -d "${TMPDIR:-/tmp}/WaxFrameInstall.XXXXXX")"
  trap 'rm -rf "$STAGING"' EXIT

  log_step "Downloading $TAG…"
  curl -fsSL -o "$STAGING/waxframe.zip" "$BASE/$ASSET" \
    || { log_err "Release download failed."; exit 1; }

  if curl -fsSL -o "$STAGING/waxframe.sha256" "$BASE/$ASSET.sha256" 2>/dev/null; then
    log_step "Verifying SHA-256…"
    EXPECTED="$(awk 'NR==1 && $1 ~ /^[0-9A-Fa-f]{64}$/ { print tolower($1) }' "$STAGING/waxframe.sha256")"
    [ -n "$EXPECTED" ] || { log_err "Checksum file is malformed."; exit 1; }
    ACTUAL="$(sha256_of "$STAGING/waxframe.zip")" || { log_err "No SHA-256 tool available."; exit 1; }
    [ "$ACTUAL" = "$EXPECTED" ] \
      || { log_err "SHA-256 mismatch — expected $EXPECTED, got $ACTUAL. The download was not used."; exit 1; }
    log_ok "  Verified $ACTUAL"
  else
    log_warn "  No checksum published for this release; skipping verification."
  fi

  log_step "Extracting…"
  mkdir -p "$STAGING/extracted"
  unzip -q "$STAGING/waxframe.zip" -d "$STAGING/extracted" \
    || { log_err "The downloaded release is not a valid ZIP."; exit 1; }

  TREE="$STAGING/extracted"
  KIDS=0; ONLY=""
  for d in "$TREE"/*/; do [ -d "$d" ] && { KIDS=$((KIDS+1)); ONLY="${d%/}"; }; done
  FILES_AT_ROOT="$(find "$TREE" -maxdepth 1 -type f | wc -l | tr -d ' ')"
  if [ "$KIDS" -eq 1 ] && [ "$FILES_AT_ROOT" -eq 0 ]; then TREE="$ONLY"; fi

  [ -f "$TREE/index.html" ] \
    || { log_err "The downloaded release does not look like a WaxFrame folder (no index.html)."; exit 1; }

  mkdir -p "$TARGET"
  cp -R "$TREE"/. "$TARGET"/
  chmod +x "$TARGET/Update-WaxFrame.command" 2>/dev/null || true
fi

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
