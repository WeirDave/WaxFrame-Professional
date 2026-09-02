# Install-WaxFrame.ps1
#
# One-command install for WaxFrame Professional on Windows:
#
#   irm https://raw.githubusercontent.com/WeirDave/WaxFrame-Professional/main/Install-WaxFrame.ps1 | iex
#
# WaxFrame runs as local files -- there is no server and no build step -- so
# installing means putting the folder somewhere and opening index.html. Your
# licence is separate from the app: buy it once at weirdave.gumroad.com and
# enter the key in the app. This script only fetches the app itself.
#
# Two ways to get it, and it asks which on a fresh install:
#
#   Git  - a tracked checkout. Updating later fetches a few KB and checks out
#          the new tag, so it takes seconds. Git can be installed here if it
#          is missing (winget, usually under a minute).
#   ZIP  - no dependencies. Updating re-downloads the whole app and verifies
#          its SHA-256.
#
# Either way, Update-WaxFrame.ps1 in the installed folder handles updates from
# then on and picks the right mechanism automatically. Nothing here is
# WaxFrame-version-specific: the newest release is resolved at runtime.

[CmdletBinding()]
param(
  [string]$Path,
  [ValidateSet('git', 'zip', 'ask')]
  [string]$Method = 'ask',
  [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'

$Repo      = 'WeirDave/WaxFrame-Professional'
$CloneUrl  = "https://github.com/$Repo.git"
$ApiLatest = "https://api.github.com/repos/$Repo/releases/latest"

function Write-Step($m) { Write-Host $m -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host $m -ForegroundColor Green }
function Write-Warn($m) { Write-Host $m -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host $m -ForegroundColor Red }

function Test-Git {
  try { & git --version *>$null; return $LASTEXITCODE -eq 0 } catch { return $false }
}

function Test-Winget {
  try { & winget --version *>$null; return $LASTEXITCODE -eq 0 } catch { return $false }
}

function Update-PathFromRegistry {
  # winget updates PATH for new processes; this one still has the old copy.
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = (@($machine, $user, $env:Path) | Where-Object { $_ }) -join ';'
}

function Install-Git {
  if (Test-Git) { return $true }
  if (-not (Test-Winget)) {
    Write-Warn 'Git is not installed, and winget is not available to install it'
    Write-Warn 'automatically (it ships with newer Windows 10 and 11).'
    Write-Warn 'Install Git from https://git-scm.com, or choose the ZIP method.'
    return $false
  }
  Write-Step 'Installing Git...'
  $common = @('install', '--id', 'Git.Git', '-e',
              '--accept-source-agreements', '--accept-package-agreements',
              '--disable-interactivity')
  # Per-user scope avoids the admin prompt where the package allows it.
  & winget @common --scope user 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host '  Per-user install unavailable; trying the standard installer...'
    & winget @common 2>&1 | Out-Null
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Warn '  The Git install did not complete -- often a corporate policy or'
    Write-Warn '  a network restriction. Falling back to the ZIP method.'
    return $false
  }
  Update-PathFromRegistry
  if (-not (Test-Git)) {
    Write-Warn '  Git installed but is not visible in this window yet.'
    Write-Warn '  Using the ZIP method for now; reopen PowerShell to use git.'
    return $false
  }
  Write-Ok '  Git installed.'
  return $true
}

function Get-WfVersion($root) {
  $f = Join-Path $root 'js\version.js'
  if (-not (Test-Path $f)) { return $null }
  if ((Get-Content -Raw -LiteralPath $f) -match "APP_VERSION\s*=\s*['""]v?([\d.]+)\s+Pro['""]") {
    return $Matches[1]
  }
  return $null
}

function Select-Method {
  param([bool]$GitPresent)
  Write-Host ''
  Write-Host '  How would you like to install WaxFrame?'
  Write-Host ''
  Write-Host '    [1] Git  ' -NoNewline -ForegroundColor Cyan
  Write-Host '- tracked checkout, updates take seconds.' -NoNewline
  if ($GitPresent) { Write-Host ' Git is installed.' }
  else { Write-Host ' Installs Git first (~1 min).' }
  Write-Host '    [2] ZIP  ' -NoNewline -ForegroundColor Cyan
  Write-Host '- no dependencies, each update re-downloads the app.'
  Write-Host ''
  while ($true) {
    $answer = Read-Host 'Choose 1 or 2 [1]'
    if ($answer -eq '' -or $answer -eq '1') { return 'git' }
    if ($answer -eq '2') { return 'zip' }
    Write-Warn '  Enter 1 or 2.'
  }
}

# ---- Resolve the destination ---------------------------------------------------
if ($Path) {
  $target = $Path
} else {
  $target = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WaxFrame Professional'
}

$existing = Test-Path (Join-Path $target 'index.html')
if ($existing) {
  Write-Warn "WaxFrame is already installed at:"
  Write-Warn "  $target"
  Write-Warn 'Run Update-WaxFrame.ps1 inside that folder to update it.'
  if ($Host.Name -eq 'ConsoleHost') { Read-Host 'Press Enter to close' | Out-Null }
  exit 0
}

Write-Host ''
Write-Step 'WaxFrame Professional'
Write-Host "  Installing to: $target"
Write-Host ''

$hasGit = Test-Git
$interactive = ($Host.Name -eq 'ConsoleHost')
if ($Method -ne 'ask') {
  $method = $Method
} elseif ($interactive) {
  $method = Select-Method -GitPresent $hasGit
} else {
  $method = if ($hasGit) { 'git' } else { 'zip' }
}

# Git chosen but missing: offer to install it rather than dead-ending. If that
# cannot succeed, fall through to ZIP with the reason already printed.
if ($method -eq 'git' -and -not $hasGit) {
  if (Install-Git) { $hasGit = $true } else { $method = 'zip' }
}

try {
  if ($method -eq 'git') {
    Write-Step "Cloning $Repo..."
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    & git clone --quiet $CloneUrl $target
    if ($LASTEXITCODE -ne 0) { throw 'Clone failed. Check your network or proxy settings.' }

    # Land on the newest release rather than whatever main happens to be.
    $tags = & git -C $target tag --list 'v*' |
            Where-Object { $_ -match '^v[0-9]+(\.[0-9]+)+$' }
    if ($tags) {
      $tag = ($tags | Sort-Object { [version]($_ -replace '^v','') } | Select-Object -Last 1)
      Write-Step "Checking out $tag..."
      & git -C $target -c advice.detachedHead=false checkout --force $tag 2>&1 | Out-Null
    }
  } else {
    Write-Step 'Finding the latest release...'
    $release = Invoke-RestMethod -Uri $ApiLatest -Headers @{ Accept = 'application/vnd.github+json' } -UseBasicParsing
    $tag = [string]$release.tag_name
    if ($tag -notmatch '^v[0-9]+(\.[0-9]+)+$') { throw "GitHub returned an unexpected release tag: $tag" }
    $version = $tag -replace '^v',''

    $assetName = "WaxFrame-Professional-$version.zip"
    $asset = $release.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
    if (-not $asset) { throw "Release $tag has no $assetName asset." }
    $sum = $release.assets | Where-Object { $_.name -eq "$assetName.sha256" } | Select-Object -First 1

    $staging = Join-Path $env:TEMP "WaxFrameInstall-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $staging -Force | Out-Null
    try {
      $zip = Join-Path $staging 'waxframe.zip'
      Write-Step "Downloading $tag..."
      Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing

      if ($sum) {
        Write-Step 'Verifying SHA-256...'
        $sumFile = Join-Path $staging 'waxframe.sha256'
        Invoke-WebRequest -Uri $sum.browser_download_url -OutFile $sumFile -UseBasicParsing
        $text = (Get-Content -Raw -LiteralPath $sumFile).Trim()
        if ($text -notmatch '^(?<hash>[A-Fa-f0-9]{64})\b') { throw 'Checksum file is malformed.' }
        $expected = $Matches['hash'].ToLowerInvariant()
        $actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $expected) {
          throw "SHA-256 mismatch -- expected $expected, got $actual. The download was not used."
        }
        Write-Ok "  Verified $actual"
      } else {
        Write-Warn '  No checksum published for this release; skipping verification.'
      }

      Write-Step 'Extracting...'
      $extract = Join-Path $staging 'extracted'
      Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
      $tree = $extract
      $kids = @(Get-ChildItem -LiteralPath $extract)
      if ($kids.Count -eq 1 -and $kids[0].PSIsContainer) { $tree = $kids[0].FullName }
      if (-not (Test-Path (Join-Path $tree 'index.html'))) {
        throw 'The downloaded release does not look like a WaxFrame folder (no index.html).'
      }

      New-Item -ItemType Directory -Path $target -Force | Out-Null
      Copy-Item -Path (Join-Path $tree '*') -Destination $target -Recurse -Force
    } finally {
      Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
    }
  }

  $installed = Get-WfVersion $target
  Write-Host ''
  if ($installed) { Write-Ok "Installed WaxFrame v$installed" } else { Write-Ok 'Installed WaxFrame' }
  Write-Host "  $target"
  Write-Host ''
  Write-Host '  Open index.html to start. Update later with Update-WaxFrame.ps1'
  Write-Host '  in that folder. Enter your licence key in the app itself.'
  Write-Host ''

  if (-not $NoLaunch) {
    $index = Join-Path $target 'index.html'
    if (Test-Path $index) {
      if ($interactive) {
        $answer = Read-Host 'Open WaxFrame now? [Y/n]'
        if ($answer -eq '' -or $answer -match '^[Yy]') { Start-Process $index }
      } else {
        Start-Process $index
      }
    }
  }
} catch {
  Write-Host ''
  Write-Err "Install failed: $($_.Exception.Message)"
  Write-Host ''
  Write-Host "Releases: https://github.com/$Repo/releases"
  if ($Host.Name -eq 'ConsoleHost') { Read-Host 'Press Enter to close' | Out-Null }
  exit 1
}
