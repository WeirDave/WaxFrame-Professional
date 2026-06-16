@echo off
REM ============================================================
REM  WaxFrame Portable Launcher (Windows)
REM ------------------------------------------------------------
REM  Why this exists: opening index.html directly via file://
REM  breaks PDF import (browsers refuse to load ESM imports
REM  across file:// origins). This script runs a tiny local
REM  web server in the WaxFrame folder so the app loads via
REM  http://localhost:8765/ and everything works.
REM
REM  Requires Python 3 on PATH. If not installed, grab it from
REM  https://python.org/downloads/ — check "Add Python to PATH"
REM  during install. No other dependencies.
REM ============================================================

cd /d "%~dp0"
echo.
echo === WaxFrame Portable Launcher ===
echo Starting local web server on http://localhost:8765 ...
echo Press Ctrl+C to stop the server (closing this window also stops it).
echo.

REM Open the browser ~2s after server boot.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8765/"

REM Try `python` then the `py` launcher.
python -m http.server 8765 2>nul
if errorlevel 1 py -m http.server 8765 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Python 3 not found on PATH.
  echo.
  echo Fix: install Python 3 from https://python.org/downloads/
  echo During install, check "Add Python to PATH", then re-run this script.
  echo.
  echo Alternative if you have Node.js: in this folder run
  echo   npx serve -l 8765
  echo.
  pause
)
