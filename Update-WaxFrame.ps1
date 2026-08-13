# Update-WaxFrame.ps1
#
# Companion updater for the WaxFrame Professional portable (file://) install.
# Run manually (right-click -> "Run with PowerShell") from inside this
# WaxFrame folder. Cannot be launched automatically from the browser tab --
# a file:// page has no way to execute a local script, by design (see
# js/update-check.js, which only ever shows instructions pointing here).
#
# What this does: checks GitHub for a newer release, downloads it, checks
# the download is structurally sound, and swaps it in -- keeping your
# current install as a dated backup folder next to this one (never
# deleted). If anything goes wrong partway through, it rolls back
# automatically so you're never left without a working copy.
#
# Deliberate scope decisions for v1 (not gaps -- stated up front):
#   - Windows/PowerShell only. No new runtime dependency for end users.
#     Mac/Linux users: download the latest release manually from GitHub
#     (the in-app "Update available" banner links straight there).
#   - No cryptographic (sha256) verification. WaxFrame's release process
#     never uploads a manually-named, digest-bearing asset -- only
#     GitHub's auto-generated per-tag zip, which carries no API digest
#     to check against. What IS verified: the download extracts cleanly,
#     the extracted tree has all the files WaxFrame needs, and its own
#     version file matches the release tag. That catches a bad/incomplete
#     download. It does not, and cannot, protect against a compromised
#     GitHub account pushing a malicious tag -- that's the same trust
#     boundary you already accept visiting waxframe.com or downloading
#     the zip by hand today.
#   - No user-data migration step. WaxFrame keeps everything you create
#     in the browser (IndexedDB/localStorage) or in a folder you pick
#     yourself via a save dialog -- never inside this app folder. So the
#     whole folder is safe to rename/replace wholesale.
#   - No running-process coordination. A file:// page isn't a process to
#     wait on or restart -- "relaunch" just means reopening index.html.
#
# Build: 20260812-002

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Repo = 'WeirDave/WaxFrame-Professional'

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host $msg -ForegroundColor Green }
function Write-Err($msg)  { Write-Host $msg -ForegroundColor Red }

function Compare-WfVersion($a, $b) {
  $pa = ($a -replace '^v', '') -split '\.' | ForEach-Object { [int]($_ -as [int]) }
  $pb = ($b -replace '^v', '') -split '\.' | ForEach-Object { [int]($_ -as [int]) }
  $len = [Math]::Max($pa.Count, $pb.Count)
  for ($i = 0; $i -lt $len; $i++) {
    $av = if ($i -lt $pa.Count) { $pa[$i] } else { 0 }
    $bv = if ($i -lt $pb.Count) { $pb[$i] } else { 0 }
    if ($av -gt $bv) { return 1 }
    if ($av -lt $bv) { return -1 }
  }
  return 0
}

function Get-WfVersion($root) {
  $versionFile = Join-Path $root 'js\version.js'
  if (-not (Test-Path $versionFile)) { return $null }
  $content = Get-Content -Raw -LiteralPath $versionFile
  if ($content -match "const\s+APP_VERSION\s*=\s*['""]v?([\d.]+)\s+Pro['""]") {
    return $Matches[1]
  }
  return $null
}

$RequiredFiles = @(
  'index.html', 'ai-api-pricing.html', 'ai-business-proposal.html', 'ai-cover-letter-editor.html',
  'ai-resume-review.html', 'api-details.html', 'document-playbooks.html', 'help.html',
  'hive-profiles.html', 'privacy.html', 'prompt-editor.html', 'start-here.html',
  'templates.html', 'terms.html', 'waxframe-user-manual.html', 'what-are-tokens.html',
  'js\version.js', 'js\app.js', 'style.css'
)

function Test-WfReleaseTree($root, $expectedVersion) {
  foreach ($f in $RequiredFiles) {
    if (-not (Test-Path (Join-Path $root $f))) {
      throw "Downloaded release is missing expected file: $f"
    }
  }
  $ver = Get-WfVersion $root
  if (-not $ver) { throw "Downloaded release: could not read APP_VERSION from js\version.js" }
  if ($expectedVersion -and ($ver -ne $expectedVersion)) {
    throw "Downloaded release version mismatch: expected $expectedVersion, found $ver"
  }
  return $ver
}

# ---- 1. Resolve install root + current version ------------------------------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $scriptDir 'index.html'))) {
  Write-Err "This script must run from inside a WaxFrame install folder (index.html not found next to it)."
  Read-Host "Press Enter to close"
  exit 1
}
$currentVersion = Get-WfVersion $scriptDir
if (-not $currentVersion) {
  Write-Err "Could not read the current version from js\version.js."
  Read-Host "Press Enter to close"
  exit 1
}
Write-Step "WaxFrame Professional updater -- currently v$currentVersion"

# ---- 2. Check latest release --------------------------------------------------
Write-Step "Checking for updates..."
try {
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" `
    -Headers @{ Accept = 'application/vnd.github+json' } -UseBasicParsing
} catch {
  Write-Err "Could not reach GitHub to check for updates: $($_.Exception.Message)"
  Read-Host "Press Enter to close"
  exit 1
}
$latestTag = [string]$release.tag_name
$latestVersion = $latestTag -replace '^v', ''
if ((Compare-WfVersion $latestVersion $currentVersion) -le 0) {
  Write-Ok "Already up to date (v$currentVersion)."
  Read-Host "Press Enter to close"
  exit 0
}
Write-Ok "v$latestVersion is available (you have v$currentVersion)."

# ---- 3. Download into staging --------------------------------------------------
# Staged OUTSIDE $scriptDir, in %TEMP%. Staging inside the install folder
# would break step 8's atomic swap: once $scriptDir gets renamed to the
# backup name, every path computed under it (this staging folder included)
# would silently move along with it, invalidating $extractedRoot mid-run.
$staging = Join-Path $env:TEMP "WaxFrameUpdate-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $staging -Force | Out-Null
$zipPath = Join-Path $staging 'download.zip'
$extractPath = Join-Path $staging 'extracted'

function Remove-Staging {
  if (Test-Path $staging) { Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue }
}

try {
  Write-Step "Downloading v$latestVersion..."
  $downloadUrl = if ($release.zipball_url) { $release.zipball_url } else { "https://github.com/$Repo/archive/refs/tags/$latestTag.zip" }
  Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

  # ---- 4/5. Extract + handle GitHub's wrapper folder --------------------------
  Write-Step "Extracting..."
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force
  $children = Get-ChildItem -LiteralPath $extractPath -Directory
  if ($children.Count -ne 1) {
    throw "Unexpected archive layout: expected exactly one top-level folder, found $($children.Count)."
  }
  $extractedRoot = $children[0].FullName

  # ---- 6/7. Validate structurally (no sha256 -- see header comment) -----------
  Write-Step "Verifying..."
  Test-WfReleaseTree $extractedRoot $latestVersion | Out-Null
  Write-Ok "Verified: v$latestVersion, all required files present."

  # ---- 8. Atomic swap with backup ----------------------------------------------
  Write-Step "Installing..."
  $parent = Split-Path -Parent $scriptDir
  $folderName = Split-Path -Leaf $scriptDir
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backupLeaf = "$folderName.previous-$currentVersion-$timestamp"
  $backupPath = Join-Path $parent $backupLeaf

  Rename-Item -LiteralPath $scriptDir -NewName $backupLeaf -ErrorAction Stop
  try {
    Move-Item -LiteralPath $extractedRoot -Destination $scriptDir -ErrorAction Stop
  } catch {
    # Roll back: put the original folder's name back so the user is never
    # left without a working copy.
    if ((Test-Path $backupPath) -and (-not (Test-Path $scriptDir))) {
      Rename-Item -LiteralPath $backupPath -NewName $folderName -ErrorAction SilentlyContinue
    }
    throw
  }

  Write-Ok "Updated to v$latestVersion. Your previous copy is kept at:"
  Write-Ok "  $backupPath"

  # ---- 9. Relaunch ---------------------------------------------------------------
  Write-Step "Reopening WaxFrame..."
  Start-Process (Join-Path $scriptDir 'index.html')

} catch {
  Write-Err "Update failed: $($_.Exception.Message)"
  Write-Err "Nothing was left half-installed -- your previous copy is intact."
  Read-Host "Press Enter to close"
  exit 1
} finally {
  Remove-Staging
}

Read-Host "Press Enter to close"
