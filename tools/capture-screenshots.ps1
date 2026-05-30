# tools/capture-screenshots.ps1
#
# Thin launcher for the WaxFrame screenshot capture driver. All capture logic
# lives in tools/capture.mjs (Node, drives Chrome via DevTools Protocol with
# a deterministic readiness handshake -- no races). This script's only jobs:
#   1. Find a usable Chrome binary (64-bit preferred over Edge x86 stub).
#   2. Find Node (capture.mjs uses built-in WebSocket/fetch, needs Node 22+).
#   3. Invoke `node tools\capture.mjs` with repo/browser/output paths.
#
# Usage:
#   pwsh -ExecutionPolicy Bypass -File ".\capture-screenshots.ps1"
#   pwsh -ExecutionPolicy Bypass -File ".\capture-screenshots.ps1" -Theme dark
#   pwsh -ExecutionPolicy Bypass -File ".\capture-screenshots.ps1" -OnlyWork

[CmdletBinding()]
param(
  [ValidateSet('both','dark','light')] [string]$Theme = 'both',
  [switch]$OnlyWork
)

$ErrorActionPreference = 'Stop'

# ---- Paths -------------------------------------------------------------------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$outDir    = Join-Path $repoRoot 'screenshots'
$driver    = Join-Path $scriptDir 'capture.mjs'

if (-not (Test-Path $driver)) {
  Write-Host "ERROR: capture.mjs not found at $driver" -ForegroundColor Red
  exit 2
}
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

# ---- Find a usable Chromium browser -----------------------------------------
# Prefer 64-bit Chrome. Edge ships as an x86 stub on many systems that fails
# headless silently (the launch hands off to the user's running browser).
$browser = $null
$candidates = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
foreach ($c in $candidates) {
  if ($c -and (Test-Path $c)) { $browser = $c; break }
}
if (-not $browser) {
  Write-Host "ERROR: No Chrome or Edge found. Install Chrome (64-bit recommended)." -ForegroundColor Red
  exit 3
}

# ---- Find Node (22+ required for built-in WebSocket) ------------------------
$node = $null
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) { $node = $nodeCmd.Source }
if (-not $node) {
  foreach ($p in @(
    "${env:ProgramFiles}\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe"
  )) {
    if ($p -and (Test-Path $p)) { $node = $p; break }
  }
}
if (-not $node) {
  Write-Host "ERROR: Node.js not found in PATH or default install location." -ForegroundColor Red
  Write-Host "       Install Node 22+ from https://nodejs.org/" -ForegroundColor Red
  exit 4
}

# ---- Sanity-check Node version (needs 22+ for global WebSocket) -------------
try {
  $nodeVer = (& $node --version) 2>$null
  if ($nodeVer -match '^v(\d+)\.') {
    $major = [int]$Matches[1]
    if ($major -lt 22) {
      Write-Host "ERROR: Node $nodeVer is too old. capture.mjs needs Node 22+ for built-in WebSocket." -ForegroundColor Red
      exit 5
    }
  }
} catch { }

# ---- Invoke the driver ------------------------------------------------------
$driverArgs = @($driver, $repoRoot, $browser, $outDir, $Theme)
if ($OnlyWork) { $driverArgs += '--only-work' }

& $node @driverArgs
exit $LASTEXITCODE
