@echo off
rem Update-WaxFrame.cmd
rem
rem Double-click to update this WaxFrame folder to the newest release. This is
rem only a launcher for Update-WaxFrame.ps1 (which does the work and explains
rem each step): a .ps1 opens in Notepad when double-clicked, and Windows 11
rem hides "Run with PowerShell" under "Show more options".
rem
rem The working directory is moved out of this folder first. Windows will not
rem rename a folder that any process is using as its working directory, and the
rem updater swaps this folder for the new version by renaming it.
rem
rem The last command leaves cmd on the same line as the updater: cmd reads a
rem batch file as it runs, and by then this folder has been swapped for the new
rem version, so a further line would be read from a path that no longer exists.
rem
rem No version number lives here -- the updater reads js\version.js itself.

setlocal
set "WF_UPDATER=%~dp0Update-WaxFrame.ps1"

if not exist "%WF_UPDATER%" (
  echo Update-WaxFrame.ps1 was not found next to this file.
  echo Download the newest release from https://github.com/WeirDave/WaxFrame-Professional/releases/latest
  pause
  exit /b 1
)

cd /d "%TEMP%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%WF_UPDATER%" & exit
