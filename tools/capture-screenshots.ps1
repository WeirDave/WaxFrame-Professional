<#
================================================================
  WaxFrame — capture-screenshots.ps1
  Regenerates the user-manual / README screenshots by driving a
  headless Chrome (or Chromium) through each public screen and
  saving a clean 1920x1080 PNG per screen, in both light and dark.

  Uses Node (already required for the build) to serve the repo over
  http://127.0.0.1 so the ?cap= query string and the pdf.min.mjs ES
  module both work — headless browsers mishandle query strings and
  module imports over file://, which is why http is required.

  USAGE  (run from the tools\ folder or repo root):
    pwsh -ExecutionPolicy Bypass -File .\capture-screenshots.ps1
  OPTIONS:
    -RepoRoot <path>     Repo root (default: this script's parent)
    -BrowserPath <path>  Force a Chrome/Edge/Chromium exe
    -Theme light|dark|both   (default: both)
    -Port <int>          Local server port (default: 8731)
    -OnlyWork            Capture just the work screen

  Captures cold: welcome, setup1-5, settings, work. Live-round
  states (building/convergence) need a seeded session — still manual.
================================================================
#>
[CmdletBinding()]
param(
  [string]$RepoRoot,
  [string]$BrowserPath,
  [ValidateSet('light','dark','both')][string]$Theme = 'both',
  [int]$Port = 8731,
  [switch]$OnlyWork
)
$ErrorActionPreference = 'Stop'

# --- Repo root + output -------------------------------------------------
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$indexPath = Join-Path $RepoRoot 'index.html'
if (-not (Test-Path $indexPath)) { Write-Host "ERROR: index.html not found at $indexPath" -ForegroundColor Red; exit 1 }
$outDir = Join-Path $RepoRoot 'screenshots'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# --- Find a Chromium browser (prefer 64-bit Chrome, then 64-bit Edge) ---
function Find-Browser {
  $c = @(
    "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$Env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${Env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${Env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($p in $c) { if ($p -and (Test-Path $p)) { return $p } }
  return $null
}
if (-not $BrowserPath) { $BrowserPath = Find-Browser }
if (-not $BrowserPath -or -not (Test-Path $BrowserPath)) { Write-Host "ERROR: No Chrome/Edge found. Pass -BrowserPath." -ForegroundColor Red; exit 1 }

# --- Require Node -------------------------------------------------------
$node = (Get-Command node -ErrorAction SilentlyContinue)
if (-not $node) { Write-Host "ERROR: Node not found on PATH (needed for the local server)." -ForegroundColor Red; exit 1 }

Write-Host "Browser : $BrowserPath" -ForegroundColor DarkGray
Write-Host "Repo    : $RepoRoot"   -ForegroundColor DarkGray
Write-Host "Output  : $outDir"     -ForegroundColor DarkGray
Write-Host "Server  : http://127.0.0.1:$Port  (Node)" -ForegroundColor DarkGray
Write-Host "Theme   : $Theme`n"    -ForegroundColor DarkGray

# --- Start a tiny Node static server rooted at the repo -----------------
$serverJs = Join-Path $env:TEMP "wf-static-$Port.js"
@"
const http=require('http'),fs=require('fs'),path=require('path');
const root=process.argv[2], port=+process.argv[3];
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg','.flac':'audio/flac'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if(p==='/')p='/index.html';
  let fp=path.join(root,p);
  if(!fp.startsWith(root)){res.writeHead(403);return res.end();}
  fs.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);return res.end('404');}
    res.writeHead(200,{'Content-Type':mime[path.extname(fp).toLowerCase()]||'application/octet-stream'});
    res.end(d);
  });
}).listen(port,'127.0.0.1',()=>console.log('up'));
"@ | Set-Content -Path $serverJs -Encoding UTF8

$server = Start-Process -FilePath $node.Source -ArgumentList @($serverJs, "`"$RepoRoot`"", $Port) -PassThru -WindowStyle Hidden
Start-Sleep -Milliseconds 800   # let it bind

# --- Shot list ----------------------------------------------------------
$shots = @(
  @{ cap='welcome';   base='welcome'  },
  @{ cap='bees';      base='setup1'   },
  @{ cap='builder';   base='setup2'   },
  @{ cap='project';   base='setup3'   },
  @{ cap='reference'; base='setup4'   },
  @{ cap='document';  base='setup5'   },
  @{ cap='settings';  base='settings' },
  @{ cap='work';      base='work'     }
)
if ($OnlyWork) { $shots = $shots | Where-Object { $_.cap -eq 'work' } }
$themes = if ($Theme -eq 'both') { @('dark','light') } else { @($Theme) }

# --- Capture loop -------------------------------------------------------
$profileDir = Join-Path $env:TEMP ("wf-capture-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
$ok = 0; $fail = 0
try {
  foreach ($s in $shots) {
    foreach ($th in $themes) {
      $outFile = Join-Path $outDir ("screenshot_{0}_{1}.png" -f $s.base, $th)
      if (Test-Path $outFile) { Remove-Item $outFile -Force }
      $url = "http://127.0.0.1:$Port/index.html?cap=$($s.cap)&theme=$th"
      $args = @(
        '--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1',
        '--window-size=1920,1080','--virtual-time-budget=6000',
        "--user-data-dir=$profileDir",'--no-first-run','--no-default-browser-check',
        "--screenshot=$outFile", $url
      )
      Write-Host ("Capturing {0,-9} {1,-5} -> screenshot_{2}_{3}.png ... " -f $s.cap,$th,$s.base,$th) -NoNewline
      & $BrowserPath @args *> $null
      # Chrome's --screenshot returns before the PNG finishes writing. Poll for the
      # file to appear AND stop growing (stable size) before declaring success.
      $deadline = (Get-Date).AddSeconds(20)
      $lastLen = -1; $stable = 0; $done = $false
      while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 250
        if (Test-Path $outFile) {
          $len = (Get-Item $outFile).Length
          if ($len -gt 0 -and $len -eq $lastLen) { $stable++ } else { $stable = 0 }
          $lastLen = $len
          if ($stable -ge 3) { $done = $true; break }   # same size 3 checks running = fully written
        }
      }
      if ($done) {
        $kb=[math]::Round($lastLen/1KB); Write-Host "OK ($kb KB)" -ForegroundColor Green; $ok++
      } else { Write-Host "FAILED" -ForegroundColor Red; $fail++ }
      Start-Sleep -Milliseconds 200   # settle before next capture so writes can't bleed across shots
    }
  }
}
finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item $serverJs -Force -ErrorAction SilentlyContinue
  Remove-Item $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Done: $ok captured, $fail failed." -ForegroundColor Cyan
if ($fail -gt 0) { Write-Host "If failures persist, pass -BrowserPath to a Chrome/Edge exe." -ForegroundColor Yellow }
