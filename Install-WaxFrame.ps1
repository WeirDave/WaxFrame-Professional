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
#          its SHA-256. When the GitHub CLI (gh) is installed, the release's
#          build-provenance attestation is verified too and a failed check
#          refuses the download; without gh the SHA-256 and the
#          `gh attestation verify` command are printed.
#
# Either way, Update-WaxFrame.cmd (which runs Update-WaxFrame.ps1) in the
# installed folder handles updates from then on and picks the right mechanism
# automatically. Nothing here is
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

# ---- Download safety helpers ------------------------------------------------
# Kept identical in Update-WaxFrame.ps1 (an irm | iex script cannot dot-source
# a shared file).

# The SHA-256 sidecar is published in the same release as the ZIP, so on its
# own it only proves the download was not corrupted. When the GitHub CLI is
# installed, also check the build-provenance attestation the release workflow
# signs. A failed check refuses the download. Without gh the checksum still
# stands, and the exact command is printed so it can be run by hand.
function Confirm-WfAttestation($zip, $assetName, $sha256) {
  $gh = Get-Command gh -CommandType Application -ErrorAction SilentlyContinue
  if (-not $gh) {
    Write-Warn "GitHub CLI (gh) not found -- build provenance was not checked, only the SHA-256."
    Write-Warn "  SHA-256 of $assetName : $sha256"
    Write-Warn "  To verify it independently: gh attestation verify $assetName --repo $Repo"
    return
  }
  # gh writes progress to stderr; under 'Stop' that would throw on success.
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & gh attestation verify $zip --repo $Repo 2>&1
    $code = $LASTEXITCODE
    $loggedIn = $true
    if ($code -ne 0) {
      & gh auth status *>$null
      $loggedIn = ($LASTEXITCODE -eq 0)
    }
  } finally { $ErrorActionPreference = $prevEap }
  if ($code -eq 0) { Write-Ok "Build provenance verified (gh attestation)."; return }
  if (-not $loggedIn) {
    # gh needs a login to fetch attestations. Not logged in is "could not
    # check", not "checked and failed", so behave as if gh were absent.
    Write-Warn "GitHub CLI is installed but not signed in, so build provenance was not checked."
    Write-Warn "  SHA-256 of $assetName : $sha256"
    Write-Warn "  After 'gh auth login': gh attestation verify $assetName --repo $Repo"
    return
  }
  throw "Build provenance check failed (gh attestation verify) -- the download was not used. $((@($output | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" } } | Where-Object { $_ }) -join ' ').Trim())"
}

# Refuse an archive before extracting any of it: no entry may climb out of the
# destination ('..' segments), be absolute, carry a drive letter / stream
# colon, or be a symbolic link. Windows PowerShell 5.1 compatible.
function Test-WfZipEntries($zip) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($zip)
  try {
    foreach ($entry in $archive.Entries) {
      $norm = $entry.FullName -replace '\\', '/'
      if ($norm.StartsWith('/') -or $norm.Contains(':') -or $norm -match '(^|/)\.\.(/|$)') {
        throw "Release archive contains an unsafe path: $($entry.FullName)"
      }
      # The Unix mode lives in the top 16 bits of the external attributes.
      if ((([int64]$entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) {
        throw "Release archive contains a symbolic link: $($entry.FullName)"
      }
    }
  } finally { $archive.Dispose() }
}

# After extraction: the root must still sit under the staging folder and the
# tree must hold no reparse points (junctions / symlinks).
function Assert-WfExtractedSafe($root, $stage) {
  $sep = [IO.Path]::DirectorySeparatorChar
  $stageFull = [IO.Path]::GetFullPath($stage).TrimEnd('\', '/') + $sep
  $rootFull = [IO.Path]::GetFullPath($root)
  if (-not (($rootFull.TrimEnd('\', '/') + $sep).StartsWith($stageFull, [StringComparison]::OrdinalIgnoreCase))) {
    throw "Extracted release root is outside the staging folder: $rootFull"
  }
  $link = Get-ChildItem -LiteralPath $root -Recurse -Force |
    Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint } | Select-Object -First 1
  if ($link) { throw "Extracted release contains a link: $($link.FullName)" }
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
  # Resolved against the PowerShell location (not the process directory) so a
  # relative -Path has a real parent folder to build beside.
  $target = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
} else {
  $target = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WaxFrame Professional'
}

$existing = Test-Path (Join-Path $target 'index.html')
if ($existing) {
  Write-Warn "WaxFrame is already installed at:"
  Write-Warn "  $target"
  Write-Warn 'Double-click Update-WaxFrame.cmd inside that folder to update it.'
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

# A folder this run creates is removed again if the install fails, so a failed
# clone or copy never leaves a half-made WaxFrame folder behind. A folder that
# was already there is never deleted.
$createdTarget = -not (Test-Path -LiteralPath $target)
$cleanupTarget = $true
$extract = $null

try {
  if ($method -eq 'git') {
    Write-Step "Cloning $Repo..."
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    & git clone --quiet -- $CloneUrl $target
    if ($LASTEXITCODE -ne 0) { throw 'Clone failed. Check your network or proxy settings.' }

    # Land on the newest release rather than whatever main happens to be.
    $tags = & git -C $target tag --list 'v*' |
            Where-Object { $_ -match '^v[0-9]+(\.[0-9]+)+$' }
    # No release tag, or a tag that cannot be checked out, is an error: the
    # alternative is a folder sitting on main, which is unreleased code.
    if (-not $tags) { throw 'No release tag was found in the repository, so nothing was installed.' }
    $tag = ($tags | Sort-Object { [version]($_ -replace '^v','') } | Select-Object -Last 1)
    Write-Step "Checking out $tag..."
    # Windows PowerShell 5.1 turns any native stderr line into a terminating
    # error while $ErrorActionPreference is 'Stop', and git reports a normal
    # checkout ("HEAD is now at ...") on stderr. Relax it for this one call and
    # judge the result by git's exit code instead.
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & git -C $target -c advice.detachedHead=false checkout --force $tag 2>&1 | Out-Null }
    finally { $ErrorActionPreference = $prevEap }
    if ($LASTEXITCODE -ne 0) { throw "Could not check out $tag, so nothing was installed." }
  } else {
    Write-Step 'Finding the latest release...'
    $release = Invoke-RestMethod -Uri $ApiLatest -Headers @{ Accept = 'application/vnd.github+json' } -UseBasicParsing
    $tag = [string]$release.tag_name
    if ($tag -notmatch '^v[0-9]+(\.[0-9]+)+$') { throw "GitHub returned an unexpected release tag: $tag" }
    $version = $tag -replace '^v',''

    # The asset URLs are built from the repo and the validated tag, never taken
    # from the API response, so the download cannot be pointed elsewhere.
    $assetName = "WaxFrame-Professional-$version.zip"
    $releaseBaseUrl = "https://github.com/$Repo/releases/download/$tag"

    # An existing folder is only usable when empty; the ZIP is built beside it
    # and renamed into place, which cannot merge into a populated folder.
    if ((Test-Path -LiteralPath $target) -and (@(Get-ChildItem -LiteralPath $target -Force).Count -gt 0)) {
      throw "$target already exists and is not empty. Choose another folder with -Path."
    }

    $staging = Join-Path $env:TEMP "WaxFrameInstall-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $staging -Force | Out-Null
    # Extracted NEXT TO the target, so the final step is a same-volume rename.
    # Copying the files into place would leave a partial app (index.html
    # present, the rest missing) if it died halfway.
    $extract = "$target.incoming-$([guid]::NewGuid().ToString('N'))"
    try {
      $zip = Join-Path $staging 'waxframe.zip'
      Write-Step "Downloading $tag..."
      Invoke-WebRequest -Uri "$releaseBaseUrl/$assetName" -OutFile $zip -UseBasicParsing

      Write-Step 'Verifying SHA-256...'
      $sumFile = Join-Path $staging 'waxframe.sha256'
      # Absent and wrong are the same answer. A release with no published
      # checksum is refused rather than installed with a warning: anyone able
      # to serve a malicious ZIP simply does not publish a correct hash beside
      # it, so "verify only when one is offered" hands them the whole check.
      # This also fires when an asset build half-fails, hence the releases page.
      $checksumUrl = "$releaseBaseUrl/$assetName.sha256"
      try {
        Invoke-WebRequest -Uri $checksumUrl -OutFile $sumFile -UseBasicParsing
      } catch {
        throw "Release $tag publishes no $assetName.sha256 checksum, so the download cannot be verified. Nothing was installed. See https://github.com/$Repo/releases for a complete release."
      }
      $text = (Get-Content -Raw -LiteralPath $sumFile).Trim()
      if ($text -notmatch '^(?<hash>[A-Fa-f0-9]{64})\b') { throw 'Checksum file is malformed.' }
      $expected = $Matches['hash'].ToLowerInvariant()
      $actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($actual -ne $expected) {
        throw "SHA-256 mismatch -- expected $expected, got $actual. The download was not used."
      }
      Write-Ok "  Verified $actual"
      Confirm-WfAttestation $zip $assetName $actual

      Write-Step 'Extracting...'
      Test-WfZipEntries $zip
      Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
      $tree = $extract
      $kids = @(Get-ChildItem -LiteralPath $extract)
      if ($kids.Count -eq 1 -and $kids[0].PSIsContainer) { $tree = $kids[0].FullName }
      Assert-WfExtractedSafe $tree $extract
      if (-not (Test-Path (Join-Path $tree 'index.html'))) {
        throw 'The downloaded release does not look like a WaxFrame folder (no index.html).'
      }
      # The updaters make the same check: the bytes must be the release asked for.
      $treeVersion = Get-WfVersion $tree
      if ($treeVersion -ne $version) {
        throw "Downloaded release version mismatch: expected $version, found $treeVersion"
      }

      $parent = Split-Path -Parent $target
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
      if (Test-Path -LiteralPath $target) { [IO.Directory]::Delete($target) }  # empty, checked above
      [IO.Directory]::Move($tree, $target)
    } finally {
      Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
      if (Test-Path -LiteralPath $extract) { Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction SilentlyContinue }
    }
  }
  $cleanupTarget = $false

  $installed = Get-WfVersion $target
  Write-Host ''
  if ($installed) { Write-Ok "Installed WaxFrame v$installed" } else { Write-Ok 'Installed WaxFrame' }
  Write-Host "  $target"
  Write-Host ''
  Write-Host '  Open index.html to start. Update later by double-clicking Update-WaxFrame.cmd'
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
  if ($cleanupTarget -and $createdTarget -and (Test-Path -LiteralPath $target)) {
    Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue
  }
  Write-Host ''
  Write-Err "Install failed: $($_.Exception.Message)"
  Write-Host ''
  Write-Host "Releases: https://github.com/$Repo/releases"
  if ($Host.Name -eq 'ConsoleHost') { Read-Host 'Press Enter to close' | Out-Null }
  exit 1
}
