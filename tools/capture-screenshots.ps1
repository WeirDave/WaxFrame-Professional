<#
================================================================
  WaxFrame — capture-screenshots.ps1
  Regenerates the user-manual / helper-page screenshots by driving
  a headless Edge (or Chrome) browser through each public screen at a
  fixed viewport, in dark theme, and saving a clean PNG per screen.

  No npm, no dependencies — uses the Edge/Chrome already on the box.
  Air-gap safe: renders the local repo over file:// (no network).

  HOW IT WORKS
    index.html accepts ?cap=<screen>&theme=dark (added in v3.63.53).
    The browser loads the page, the in-app hook calls goToScreen() to
    land on the requested screen, and --screenshot grabs the result.

  USAGE
    Right-click > Run with PowerShell, or from a terminal:
      .\tools\capture-screenshots.ps1
    Options:
      -RepoRoot  <path>   Repo root (default: this script's parent dir)
      -BrowserPath <path> Force a specific msedge.exe / chrome.exe
      -Theme     <name>   light | dark | auto   (default: dark)
      -OnlyWork           Capture just the work screen
      -KeepUrlBar         (no-op; reserved)

  WHAT IT CAPTURES (cold, no sign-in needed)
    welcome, the 5 setup steps, settings, and the work screen chrome.

  WHAT IT CANNOT CAPTURE
    Live-round states (building / convergence) and a populated work
    screen need a seeded session — grab those manually for now, or
    extend the capture hook to load a demo session.
================================================================
#>

[CmdletBinding()]
param(
  [string]$RepoRoot,
  [string]$BrowserPath,
  [ValidateSet('light','dark','both')][string]$Theme = 'both',
  [switch]$OnlyWork
)

$ErrorActionPreference = 'Stop'

# --- Resolve repo root (script lives in <repo>\tools\) -----------------
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$indexPath = Join-Path $RepoRoot 'index.html'
if (-not (Test-Path $indexPath)) {
  Write-Host "ERROR: index.html not found at $indexPath" -ForegroundColor Red
  Write-Host "Pass -RepoRoot <path to WaxFrame-Professional>." -ForegroundColor Yellow
  exit 1
}
$outDir = Join-Path $RepoRoot 'screenshots'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# --- Locate a Chromium browser -----------------------------------------
function Find-Browser {
  $candidates = @(
    "$Env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${Env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${Env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}
if (-not $BrowserPath) { $BrowserPath = Find-Browser }
if (-not $BrowserPath -or -not (Test-Path $BrowserPath)) {
  Write-Host "ERROR: Could not find Edge or Chrome. Pass -BrowserPath." -ForegroundColor Red
  exit 1
}
Write-Host "Browser : $BrowserPath" -ForegroundColor DarkGray
Write-Host "Repo    : $RepoRoot"   -ForegroundColor DarkGray
Write-Host "Output  : $outDir"     -ForegroundColor DarkGray
Write-Host "Theme   : $Theme`n"    -ForegroundColor DarkGray

# --- file:// base URL ---------------------------------------------------
$fileUri = ([System.Uri](Resolve-Path $indexPath).Path).AbsoluteUri  # file:///C:/...

# --- Shot list: cap key + filename base + width/height -----------------
# Output names match screenshots\ convention: screenshot_<base>_<theme>.png
$shots = @(
  @{ cap='welcome';   base='welcome';  w=1440; h=810 },
  @{ cap='bees';      base='setup1';   w=1440; h=810 },
  @{ cap='builder';   base='setup2';   w=1440; h=810 },
  @{ cap='project';   base='setup3';   w=1440; h=810 },
  @{ cap='reference'; base='setup4';   w=1440; h=810 },
  @{ cap='document';  base='setup5';   w=1440; h=810 },
  @{ cap='settings';  base='settings'; w=1440; h=810 },
  @{ cap='work';      base='work';     w=1600; h=900 }
)
$themes = if ($Theme -eq 'both') { @('dark','light') } else { @($Theme) }

if ($OnlyWork) { $shots = $shots | Where-Object { $_.cap -eq 'work' } }

# --- Capture loop -------------------------------------------------------
$ok = 0; $fail = 0
foreach ($s in $shots) {
  foreach ($th in $themes) {
    $outFile = Join-Path $outDir ("screenshot_{0}_{1}.png" -f $s.base, $th)
    if (Test-Path $outFile) { Remove-Item $outFile -Force }
    $url = "$fileUri?cap=$($s.cap)&theme=$th"
    $args = @(
      '--headless=new','--disable-gpu','--hide-scrollbars',
      '--force-device-scale-factor=1',"--window-size=$($s.w),$($s.h)",
      '--virtual-time-budget=4000','--allow-file-access-from-files',
      "--screenshot=$outFile",$url
    )
    Write-Host ("Capturing {0,-9} {1,-5} -> screenshot_{2}_{3}.png ... " -f $s.cap,$th,$s.base,$th) -NoNewline
    & $BrowserPath @args *> $null
    if ((Test-Path $outFile) -and ((Get-Item $outFile).Length -gt 0)) {
      $kb=[math]::Round((Get-Item $outFile).Length/1KB); Write-Host "OK ($kb KB)" -ForegroundColor Green; $ok++
    } else { Write-Host "FAILED" -ForegroundColor Red; $fail++ }
  }
}

Write-Host ""
Write-Host "Done: $ok captured, $fail failed." -ForegroundColor Cyan
if ($fail -gt 0) {
  Write-Host "Tip: if all failed, your Edge may not support --headless=new." -ForegroundColor Yellow
  Write-Host "     Try -BrowserPath to a current Edge/Chrome, or update Edge." -ForegroundColor Yellow
}
