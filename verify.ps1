$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$tsc = Join-Path $PSScriptRoot 'node_modules\.bin\tsc.cmd'
$electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'

Write-Host '[1/5] typecheck'
& $tsc -p tsconfig.json --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL typecheck'; exit 1 }
& $tsc -p tsconfig.renderer.json --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL typecheck (renderer)'; exit 1 }
Write-Host 'PASS typecheck'

Write-Host '[2/5] build'
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL build'; exit 1 }
Write-Host 'PASS build'

Write-Host '[3/5] launch'
$first = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru
Start-Sleep -Seconds 6
if ($first.HasExited) { Write-Host 'FAIL launch: process exited early'; exit 1 }
Write-Host "PASS launch (pid $($first.Id))"

Write-Host '[4/5] single instance'
$second = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru
Start-Sleep -Seconds 4
if (-not $second.HasExited) {
  Stop-Process -Id $second.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL single instance: second process stayed alive'
  exit 1
}
if ($first.HasExited) {
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL single instance: first process died when second launched'
  exit 1
}
Write-Host 'PASS single instance'

Write-Host '[5/5] UI spec'
$main = Get-Content (Join-Path $PSScriptRoot 'src\main\index.ts') -Raw
$base = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\base.css') -Raw
$pill = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\pill.css') -Raw
$panel = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\panel.css') -Raw
$preview = Get-Content (Join-Path $PSScriptRoot 'showcase\app-preview.html') -Raw
$uiFail = $false
if ($main -notmatch 'width: 184' -or $main -notmatch 'showInactive') {
  Write-Host 'FAIL UI spec: window must be 184 and showInactive'
  $uiFail = $true
}
if ($base -notmatch 'padding: 6px 4px') {
  Write-Host 'FAIL UI spec: body padding must be 6px 4px for the 32px capsule'
  $uiFail = $true
}
foreach ($width in @('104px', '128px', '176px', '132px', '140px')) {
  if ($pill -notmatch [regex]::Escape($width)) {
    Write-Host "FAIL UI spec: pill.css missing $width"
    $uiFail = $true
  }
}
if ($panel -notmatch 'width: 148px') {
  Write-Host 'FAIL UI spec: music art must be 148px on the left'
  $uiFail = $true
}
if ($preview -notmatch 'f-open \{ width: 428px' -or $preview -notmatch 'f-open \{ width: 428px; height: 308px; padding: 4px' -or $preview -notmatch 'compare-window \[data-pill\].*height: 32px') {
  Write-Host 'FAIL UI spec: preview must be 420 panel and 32 compare frame'
  $uiFail = $true
}
if ($uiFail) {
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  exit 1
}
Write-Host 'PASS UI spec'

Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 800
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host 'ALL CHECKS PASSED'
exit 0
