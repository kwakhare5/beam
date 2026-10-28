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
$controls = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\controls.css') -Raw
$tabsCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\tabs.css') -Raw
$preview = Get-Content (Join-Path $PSScriptRoot 'showcase\app-preview.html') -Raw
$music = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\tabs\music.ts') -Raw
$timer = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\tabs\timer.ts') -Raw
$calendarTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\tabs\calendar.ts') -Raw
$settingsTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\tabs\settings.ts') -Raw
$filesTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\tabs\files.ts') -Raw
$pillTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\pill.ts') -Raw
$tokens = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\tokens.css') -Raw
$uiFail = $false
if ($main -notmatch 'width: 144' -or $main -notmatch 'showInactive') {
  Write-Host 'FAIL UI spec: window must be 144 and showInactive'
  $uiFail = $true
}
if ($base -notmatch 'padding: 6px 4px') {
  Write-Host 'FAIL UI spec: body padding must be 6px 4px for the 32px capsule'
  $uiFail = $true
}
if ($pill -notmatch 'width: 100px' -or $pill -notmatch 'width: 136px' -or $pill -notmatch '\.pill\.has-controls:hover') {
  Write-Host 'FAIL UI spec: music capsule must rest at 100 and grow to 136 on hover'
  $uiFail = $true
}
if ($pill -match 'width: (104|132|140|176|216)px') {
  Write-Host 'FAIL UI spec: capsule uses only 100 rest and 136 everywhere else'
  $uiFail = $true
}
if ($pill -notmatch '\.controls \{' -or $pill -notmatch 'position: absolute') {
  Write-Host 'FAIL UI spec: transport controls must overlay the title slot'
  $uiFail = $true
}
if ($pill -match 'scale\(1\.06\)') {
  Write-Host 'FAIL UI spec: mascot must not animate on hover'
  $uiFail = $true
}
if ($pill -notmatch '\.has-controls' -or $pillTs -notmatch 'state-icon') {
  Write-Host 'FAIL UI spec: hover swap must be scoped and paused/done need a state glyph'
  $uiFail = $true
}
if ($pillTs -match "'missing'" -or $pillTs -match 'middleTruncate') {
  Write-Host 'FAIL UI spec: the missing-filename capsule state must stay removed'
  $uiFail = $true
}
if ($music -notmatch 'class="music-controls"' -or $music -match 'controls music-controls') {
  Write-Host 'FAIL UI spec: music panel must use music-controls only'
  $uiFail = $true
}
if ($music -notmatch 'track-bar' -or $panel -notmatch 'width: 148px' -or $panel -notmatch 'height: 148px') {
  Write-Host 'FAIL UI spec: music needs square 148px art and a position bar'
  $uiFail = $true
}
if ($filesTs -notmatch 'row-action' -or $filesTs -notmatch 'drop-well' -or $filesTs -notmatch 'Folder') {
  Write-Host 'FAIL UI spec: files need row actions, a drop well, and a Folder badge'
  $uiFail = $true
}
if ($tabsCss -match '\.row \{[^}]*background:' -or $tabsCss -match '\.row-icon-box \{[^}]*background:') {
  Write-Host 'FAIL UI spec: file rows must use dividers, not stacked fills'
  $uiFail = $true
}
if ($timer -notmatch 'TimerMode' -or $timer -notmatch 'timer-input' -or $timer -notmatch "'running'") {
  Write-Host 'FAIL UI spec: timer needs idle/custom/running/done states'
  $uiFail = $true
}
if ($calendarTs -notmatch 'firstDayOfWeek' -or $calendarTs -notmatch 'aria-current') {
  Write-Host 'FAIL UI spec: calendar must follow the OS week start'
  $uiFail = $true
}
if ($calendarTs -notmatch 'cells.length < 42') {
  Write-Host 'FAIL UI spec: calendar must always render six week rows'
  $uiFail = $true
}
if ($settingsTs -notmatch 'Dark theme' -or $settingsTs -notmatch 'stepper' -or $tabsCss -notmatch '\.panel-settings') {
  Write-Host 'FAIL UI spec: settings needs real controls and a gapped-free row list'
  $uiFail = $true
}
$allStyles = $pill + $panel + $controls + $tabsCss
if ($allStyles -match 'font-size: 10px') {
  Write-Host 'FAIL UI spec: type scale starts at 11px'
  $uiFail = $true
}
if ($tokens -notmatch '--card: #1c1c1e' -or $tokens -notmatch '--card: #ffffff') {
  Write-Host 'FAIL UI spec: the shell must be solid in both themes'
  $uiFail = $true
}
if ($allStyles -match 'backdrop-filter' -or $allStyles -match 'var\(--highlight' -or $allStyles -match '0 0 6px' -or $tokens -match '--highlight') {
  Write-Host 'FAIL UI spec: no glass, no specular rim, no glow'
  $uiFail = $true
}
if ($pill -match "data-state='idle'\] \{[^}]*opacity") {
  Write-Host 'FAIL UI spec: idle must dim the label, not the solid shell'
  $uiFail = $true
}
if ($panel -notmatch '\.panel-body\[hidden\]') {
  Write-Host 'FAIL UI spec: inactive tabpanels must be hidden'
  $uiFail = $true
}
if ($panel -notmatch '\.tab-track') {
  Write-Host 'FAIL UI spec: tab bar must keep the four equal tab columns'
  $uiFail = $true
}
if ($panel -match '\.tab-track \{[^}]*background:' -or $panel -match "\.tab\[aria-selected='true'\] \{[^}]*background:") {
  Write-Host 'FAIL UI spec: tabs must be flat; no track fill and no selected fill'
  $uiFail = $true
}
if ($preview -notmatch 'bindPanelTabs') {
  Write-Host 'FAIL UI spec: preview tabs must be wired'
  $uiFail = $true
}
if ($preview -notmatch '\.f-pill \{ width: 136px' -or $preview -notmatch '\.f-pill\.is-rest \{ width: 100px') {
  Write-Host 'FAIL UI spec: preview capsule frames must be 136 and 100'
  $uiFail = $true
}
if ($preview -notmatch 'width: 144px; height: 44px') {
  Write-Host 'FAIL UI spec: preview window must be 144'
  $uiFail = $true
}
if ($preview -match 'is-wide|224px|216×32') {
  Write-Host 'FAIL UI spec: the 224 window and the 216 music width are gone'
  $uiFail = $true
}
if ($preview -notmatch '\.f-open \{ width: 452px; height: 332px; padding: 16px' -or $preview -notmatch 'compare-window \[data-pill\].*height: 32px') {
  Write-Host 'FAIL UI spec: preview must be 452 window with a 16px margin and a 32px capsule frame'
  $uiFail = $true
}
if ($preview -notmatch 'data-pill="filesMissing"' -or $preview -match 'data-pill="missing"') {
  Write-Host 'FAIL UI spec: preview must show the shelf count with a danger pip'
  $uiFail = $true
}
if ($preview -match '128px title slot' -or $preview -match '142px' -or $preview -match '428×308' -or $preview -match '176×32' -or $preview -match '184×44') {
  Write-Host 'FAIL UI spec: preview must not repeat stale geometry'
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
