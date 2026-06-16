#!/bin/bash
# ============================================================
#  WaxFrame Portable Launcher (macOS / Linux)
# ------------------------------------------------------------
#  Why this exists: opening index.html directly via file://
#  breaks PDF import (browsers refuse to load ESM imports
#  across file:// origins). This script runs a tiny local
#  web server in the WaxFrame folder so the app loads via
#  http://localhost:8765/ and everything works.
#
#  Requires Python 3 (built into macOS 12.3+ via `python3`).
#  On Linux, install via your package manager.
# ============================================================

cd "$(dirname "$0")"
PORT=8765
URL="http://localhost:${PORT}/"

echo ""
echo "=== WaxFrame Portable Launcher ==="
echo "Starting local web server on ${URL} ..."
echo "Press Ctrl+C to stop the server (closing this window also stops it)."
echo ""

# Open the browser ~2s after the server boots.
( sleep 2 && {
    if command -v open >/dev/null 2>&1; then open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
    fi
  } ) &

# Try python3 then python, then bail with a friendly message.
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
else
  echo ""
  echo "ERROR: Python 3 not found."
  echo ""
  echo "Fix: install Python 3."
  echo "  macOS: 'xcode-select --install' or download from https://python.org/downloads/"
  echo "  Linux: 'sudo apt install python3' (or your distro's equivalent)"
  echo ""
  echo "Alternative if you have Node.js: in this folder run"
  echo "  npx serve -l ${PORT}"
  echo ""
  read -p "Press Enter to close..."
fi
