$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$tsc = Join-Path $PSScriptRoot 'node_modules\.bin\tsc.cmd'
$electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'

Write-Host '[1/9] typecheck'
& $tsc -p tsconfig.json --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL typecheck'; exit 1 }
& $tsc -p tsconfig.renderer.json --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL typecheck (renderer)'; exit 1 }
Write-Host 'PASS typecheck'

Write-Host '[2/9] build'
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL build'; exit 1 }
Write-Host 'PASS build'

Write-Host '[3/9] helper build'
$helperDir = Join-Path $PSScriptRoot 'native\BeamBridge\dist'
if (Test-Path -LiteralPath $helperDir) { Remove-Item -LiteralPath $helperDir -Recurse -Force }
& dotnet publish (Join-Path $PSScriptRoot 'native\BeamBridge\BeamBridge.csproj') -c Release -o $helperDir --nologo
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL helper build'; exit 1 }
$helperExe = Join-Path $helperDir 'BeamBridge.exe'
if (-not (Test-Path -LiteralPath $helperExe)) { Write-Host 'FAIL helper build: BeamBridge.exe missing'; exit 1 }
$helperFiles = @(Get-ChildItem -LiteralPath $helperDir -File)
if ($helperFiles.Count -ne 1) { Write-Host "FAIL helper build: expected one file, found $($helperFiles.Count)"; exit 1 }
Write-Host 'PASS helper build (single exe)'

Write-Host '[4/9] clipboard'
$clipDir = Join-Path $env:TEMP 'beam-clip'
if (Test-Path -LiteralPath $clipDir) { Remove-Item -LiteralPath $clipDir -Recurse -Force }
New-Item -ItemType Directory -Path $clipDir | Out-Null
$clipFiles = @('one.txt', 'two.txt', 'three.txt') | ForEach-Object { Join-Path $clipDir $_ }
$clipFiles | ForEach-Object { Set-Content -LiteralPath $_ -Value 'beam' }
$clipPsi = New-Object System.Diagnostics.ProcessStartInfo
$clipPsi.FileName = $helperExe
$clipPsi.RedirectStandardInput = $true
$clipPsi.RedirectStandardOutput = $true
$clipPsi.RedirectStandardError = $true
$clipPsi.UseShellExecute = $false
$clipPsi.CreateNoWindow = $true
$clipProc = [System.Diagnostics.Process]::Start($clipPsi)
$clipRequest = @{ id = 1; cmd = 'files.copy'; paths = @($clipFiles) } | ConvertTo-Json -Compress
$clipProc.StandardInput.WriteLine($clipRequest)
$clipProc.StandardInput.Flush()
$clipReply = $null
for ($i = 0; $i -lt 10; $i++) {
  $lineTask = $clipProc.StandardOutput.ReadLineAsync()
  if (-not $lineTask.Wait(3000)) { break }
  if ($null -eq $lineTask.Result) { break }
  if ($lineTask.Result -match '"id":1') { $clipReply = $lineTask.Result; break }
}
$clipRaw = Get-Clipboard -Format FileDropList
$clipPaths = @($clipRaw | ForEach-Object { if ($_ -is [System.IO.FileInfo]) { $_.FullName } else { [string]$_ } })
$clipMissing = @($clipFiles | Where-Object { $clipPaths -notcontains $_ })
if ($clipReply -notmatch '"ok":true' -or $clipPaths.Count -ne 3 -or $clipMissing.Count -ne 0) {
  $clipProc.Kill()
  Write-Host "FAIL clipboard: reply '$clipReply', got $($clipPaths.Count) paths, missing $($clipMissing -join ',')"
  exit 1
}
$clipProc.StandardInput.Close()
$clipProc.WaitForExit(5000) | Out-Null
$clipAfterRaw = Get-Clipboard -Format FileDropList
$clipAfter = @($clipAfterRaw | ForEach-Object { $_ })
if ($clipAfter.Count -ne 3) {
  Write-Host "FAIL clipboard: $($clipAfter.Count) paths after helper exit"
  exit 1
}
Remove-Item -LiteralPath $clipDir -Recurse -Force
Write-Host 'PASS clipboard (3 real paths, survive helper exit)'

Write-Host '[5/9] launch + helper ping'
$outLog = Join-Path $env:TEMP 'beam-verify.out.log'
$errLog = Join-Path $env:TEMP 'beam-verify.err.log'
Remove-Item -LiteralPath $outLog -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $errLog -ErrorAction SilentlyContinue
$first = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Start-Sleep -Seconds 6
if ($first.HasExited) {
  Get-Process BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL launch: process exited early'
  exit 1
}
$appOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
if ($appOut -notmatch '\[bridge\] pong 0\.1\.0') {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL launch: app never printed pong'
  exit 1
}
Write-Host "PASS launch (pid $($first.Id)) + pong 0.1.0"

Write-Host '[6/9] helper memory'
$helper = Get-Process BeamBridge -ErrorAction SilentlyContinue
if (-not $helper) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL helper memory: helper not running'
  exit 1
}
$helperMb = [math]::Round((($helper | Measure-Object -Property PrivateMemorySize64 -Sum).Sum) / 1MB, 1)
if ($helperMb -ge 60) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL helper memory: $helperMb MB at idle (cap 60 MB)"
  exit 1
}
Write-Host "PASS helper memory ($helperMb MB idle, cap 60 MB)"

Write-Host '[7/9] single instance'
$second = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru
Start-Sleep -Seconds 4
if (-not $second.HasExited) {
  Stop-Process -Id $second.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL single instance: second process stayed alive'
  exit 1
}
if ($first.HasExited) {
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL single instance: first process died when second launched'
  exit 1
}
Write-Host 'PASS single instance'

Write-Host '[8/9] UI spec'
$main = Get-Content (Join-Path $PSScriptRoot 'src\main\index.ts') -Raw
$base = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\base.css') -Raw
$pill = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\capsule.css') -Raw
$shellCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\panel\shell.css') -Raw
$bodyCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\panel\body.css') -Raw
$buttonsCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\controls\buttons.css') -Raw
$fieldsCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\controls\fields.css') -Raw
$indicatorsCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\controls\indicators.css') -Raw
$musicCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\tabs\music.css') -Raw
$filesCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\tabs\files.css') -Raw
$timerCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\tabs\timer.css') -Raw
$calendarCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\tabs\calendar.css') -Raw
$settingsCss = Get-Content (Join-Path $PSScriptRoot 'src\renderer\styles\tabs\settings.css') -Raw
$preview = Get-Content (Join-Path $PSScriptRoot 'showcase\app-preview.html') -Raw
$music = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\panel\tabs\music.ts') -Raw
$timer = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\panel\tabs\timer.ts') -Raw
$calendarTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\panel\tabs\calendar.ts') -Raw
$settingsTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\panel\tabs\settings.ts') -Raw
$filesTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\panel\tabs\files.ts') -Raw
$pillTs = Get-Content (Join-Path $PSScriptRoot 'src\renderer\ui\capsule\pill.ts') -Raw
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
if ($pill -notmatch 'width: 100px' -or $pill -notmatch 'width: 136px' -or $pill -notmatch '\.pill\.expands:hover' -or $pill -notmatch "data-state='drag'\] \{[^}]*width: 136px") {
  Write-Host 'FAIL UI spec: capsule must rest at 100, drag at 136, and grow to 136 on hover for music/timer/done'
  $uiFail = $true
}
if ($pill -match 'width: (104|132|140|176|216)px') {
  Write-Host 'FAIL UI spec: capsule uses only 100 rest and 136 hover'
  $uiFail = $true
}
if ($pill -match "data-state='(idle|files)'\]:hover[^{]*\{[^}]*width") {
  Write-Host 'FAIL UI spec: idle and files must not grow on hover'
  $uiFail = $true
}
if ($pill -notmatch '\.pill-overlay \{' -or $pill -notmatch 'position: absolute' -or $pill -notmatch '\.pill-action') {
  Write-Host 'FAIL UI spec: hover actions must overlay the slot'
  $uiFail = $true
}
if ($pill -notmatch "has-controls:hover \.mascot-wrap" -or $pill -notmatch "data-state='timer'\] \.pill-action") {
  Write-Host 'FAIL UI spec: music hover must fade the star and the timer action must collapse at rest'
  $uiFail = $true
}
if ($pill -match 'scale\(1\.06\)') {
  Write-Host 'FAIL UI spec: mascot must not animate on hover'
  $uiFail = $true
}
if ($pill -notmatch '\.has-controls' -or $pillTs -notmatch 'state-icon' -or $pillTs -notmatch 'pill-art' -or $pill -notmatch 'media-pip\.paused' -or $pill -notmatch 'media-pip\.danger') {
  Write-Host 'FAIL UI spec: hover swap must be scoped; music needs a thumbnail and green/amber/red dots'
  $uiFail = $true
}
if ($pillTs -notmatch 'Cancel timer' -or $pillTs -notmatch 'Dismiss' -or $pillTs -notmatch 'pill-overlay') {
  Write-Host 'FAIL UI spec: timer and done need their hover actions'
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
if ($music -notmatch 'track-bar' -or $musicCss -notmatch 'width: 148px' -or $musicCss -notmatch 'height: 148px') {
  Write-Host 'FAIL UI spec: music needs square 148px art and a position bar'
  $uiFail = $true
}
if ($musicCss -notmatch 'grid-template-columns: 148px' -or $musicCss -notmatch 'grid-column: 1 / -1') {
  Write-Host 'FAIL UI spec: the music track and controls must span the panel width'
  $uiFail = $true
}
if ($shellCss -notmatch 'tab:not\(\.settings\)' -or $shellCss -notmatch 'bottom: -6px') {
  Write-Host 'FAIL UI spec: the selected content tab needs a 2px gold underline'
  $uiFail = $true
}
if ($filesTs -notmatch 'row-action' -or $filesTs -notmatch 'drop-well' -or $filesTs -notmatch 'Folder') {
  Write-Host 'FAIL UI spec: files need row actions, a drop well, and a Folder badge'
  $uiFail = $true
}
if ($filesTs -match 'row-action[^>]*disabled' -or $filesTs -notmatch 'Add files') {
  Write-Host 'FAIL UI spec: missing rows keep only remove and the footer says Add files'
  $uiFail = $true
}
if ($filesCss -match '\.row \{[^}]*background:' -or $filesCss -match '\.row-icon-box \{[^}]*background:') {
  Write-Host 'FAIL UI spec: file rows must use dividers, not stacked fills'
  $uiFail = $true
}
if ($timer -notmatch 'TimerMode' -or $timer -notmatch 'timer-input' -or $timer -notmatch "'running'") {
  Write-Host 'FAIL UI spec: timer needs idle/custom/running/done states'
  $uiFail = $true
}
if ($timer -notmatch '>Set<' -or $timer -notmatch 'Time.{0,4}s up' -or $timerCss -notmatch '\.done-check') {
  Write-Host "FAIL UI spec: the custom timer says Set and done shows a check plus Time's up"
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
if ($settingsTs -notmatch 'Dark theme' -or $settingsTs -notmatch 'stepper' -or $settingsCss -notmatch '\.panel-settings') {
  Write-Host 'FAIL UI spec: settings needs real controls and a gapped-free row list'
  $uiFail = $true
}
if ($settingsTs -notmatch 'setting-inline' -or $settingsTs -notmatch "'Dark' : 'Light'" -or $fieldsCss -notmatch '\.kbd \{[^}]*border: 0') {
  Write-Host 'FAIL UI spec: the theme row names its mode and keycaps have no outer box'
  $uiFail = $true
}
if ($pill -match ':focus-within' -or $pill -notmatch ':has\(:focus-visible\)') {
  Write-Host 'FAIL UI spec: capsule expansion must release on mouse click and hold on keyboard focus'
  $uiFail = $true
}
if ($pill -match "data-state='paused'\] \.pill-art") {
  Write-Host 'FAIL UI spec: paused keeps the artwork crisp'
  $uiFail = $true
}
if ($pillTs -notmatch 'done-label">Done<') {
  Write-Host 'FAIL UI spec: the done hover label is Done'
  $uiFail = $true
}
if ($filesCss -notmatch '\.row-action \{[^}]*pointer-events: none') {
  Write-Host 'FAIL UI spec: hidden row actions must not take clicks'
  $uiFail = $true
}
if ($settingsCss -notmatch '\.setting-value \{[^}]*display: inline-flex') {
  Write-Host 'FAIL UI spec: settings values must reserve their width'
  $uiFail = $true
}
if ($timerCss -notmatch 'spin-button') {
  Write-Host 'FAIL UI spec: the timer field hides native spinners'
  $uiFail = $true
}
if ($timer -notmatch 'showPicker' -or $timer -notmatch "mode === 'custom' \? custom") {
  Write-Host 'FAIL UI spec: timer chips stay visible in custom mode'
  $uiFail = $true
}
if ($calendarTs -notmatch '<table class="cal-grid"' -or $calendarTs -notmatch 'scope="col"') {
  Write-Host 'FAIL UI spec: the calendar is a real table with column headers'
  $uiFail = $true
}
if ($filesTs -notmatch 'clear-all' -or $filesTs -notmatch "'Clear all\?'" -or $filesTs -notmatch 'allMissing') {
  Write-Host 'FAIL UI spec: Clear All asks twice and Copy All disables when nothing can copy'
  $uiFail = $true
}
if ($base -notmatch 'user-select: none') {
  Write-Host 'FAIL UI spec: the interface must not select text'
  $uiFail = $true
}
if ($preview -match 'button\.blur\(') {
  Write-Host 'FAIL UI spec: the preview must not fake the focus release'
  $uiFail = $true
}
if ($preview -notmatch 'bindArtFallback' -or $preview -notmatch 'bindClearAll') {
  Write-Host 'FAIL UI spec: the preview must bind the art fallback and the clear arm'
  $uiFail = $true
}
$allStyles = $pill + $shellCss + $bodyCss + $buttonsCss + $fieldsCss + $indicatorsCss + $musicCss + $filesCss + $timerCss + $calendarCss + $settingsCss
if ($allStyles -match 'font-size: 10px') {
  Write-Host 'FAIL UI spec: type scale starts at 11px'
  $uiFail = $true
}
if ($tokens -notmatch '--card: #151517' -or $tokens -notmatch '--card: #f4f4f2') {
  Write-Host 'FAIL UI spec: the shell must be solid in both themes'
  $uiFail = $true
}
if ($allStyles -match 'backdrop-filter' -or $allStyles -match 'var\(--highlight' -or $allStyles -match '0 0 6px' -or $tokens -match '--highlight') {
  Write-Host 'FAIL UI spec: no glass, no specular rim, no glow'
  $uiFail = $true
}
if ($pill -match "data-state='idle'\] \{[^}]*opacity") {
  Write-Host 'FAIL UI spec: idle must dim the star and label, not the solid shell'
  $uiFail = $true
}
if ($pill -notmatch "data-state='idle'\] \.mascot \{[^}]*opacity: 0\.7" -or $pill -notmatch "data-state='idle'\]\[data-hover='true'\] \.mascot") {
  Write-Host 'FAIL UI spec: idle rest dims the star to 70% and hover restores it'
  $uiFail = $true
}
if ($allStyles -match 'background: rgba\(') {
  Write-Host 'FAIL UI spec: every fill must be a solid color, no translucent glass'
  $uiFail = $true
}
if ($tokens -match '--(secondary|muted|accent|keycap|pill-badge|destructive-soft|destructive-border):') {
  Write-Host 'FAIL UI spec: translucent fill tokens must stay deleted'
  $uiFail = $true
}
if ($tokens -notmatch '--control: #252527' -or $tokens -notmatch '--control: #e7e7e5' -or $tokens -notmatch '--surface-hover') {
  Write-Host 'FAIL UI spec: solid control and surface tokens must exist in both themes'
  $uiFail = $true
}
if ($allStyles -match '\.pill-badge') {
  Write-Host 'FAIL UI spec: metadata is plain text, not glass chips'
  $uiFail = $true
}
if ($filesTs -notmatch 'row-meta' -or $filesTs -match 'pill-badge|status-pip') {
  Write-Host 'FAIL UI spec: file rows use plain metadata text and no status pips'
  $uiFail = $true
}
if ($filesCss -notmatch '\.row-meta' -or $filesCss -match '\.row \{[^}]*border-radius') {
  Write-Host 'FAIL UI spec: file rows are flush with plain metadata'
  $uiFail = $true
}
if ($buttonsCss -notmatch '\.btn\.danger \{[^}]*background: none') {
  Write-Host 'FAIL UI spec: the danger action is a text button'
  $uiFail = $true
}
if ($bodyCss -notmatch '\.panel-body\[hidden\]') {
  Write-Host 'FAIL UI spec: inactive tabpanels must be hidden'
  $uiFail = $true
}
if ($shellCss -notmatch '\.tab-track') {
  Write-Host 'FAIL UI spec: tab bar must keep the four equal tab columns'
  $uiFail = $true
}
if ($shellCss -match '\.tab-track \{[^}]*background:' -or $shellCss -match "\.tab\[aria-selected='true'\] \{[^}]*background:") {
  Write-Host 'FAIL UI spec: tabs must be flat; no track fill and no selected fill'
  $uiFail = $true
}
if ($preview -notmatch 'bindPanelTabs') {
  Write-Host 'FAIL UI spec: preview tabs must be wired'
  $uiFail = $true
}
if ($preview -notmatch '\.f-pill \{ width: 100px' -or $preview -notmatch '\.f-pill\.is-expanded \{ width: 136px') {
  Write-Host 'FAIL UI spec: preview capsule frames must be 100 rest and 136 hover'
  $uiFail = $true
}
if ($preview -notmatch 'data-pill="timerRest"' -or $preview -notmatch 'data-pill="doneRest"' -or $preview -notmatch 'data-pill="timer"' -or $preview -notmatch 'data-pill="done"') {
  Write-Host 'FAIL UI spec: preview must show timer and done rest and hover'
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
if ($preview -notmatch 'data-pill="playingNoArt"' -or $preview -notmatch 'art: track.art' -or $preview -match 'data-page="proposals"|data-prop-pill|g-proposal') {
  Write-Host 'FAIL UI spec: preview must show art and the star fallback, and the proposal page must be gone'
  $uiFail = $true
}
if ($preview -match '128px title slot' -or $preview -match '142px' -or $preview -match '428×308' -or $preview -match '176×32' -or $preview -match '184×44' -or $preview -match '1px each side' -or $preview -match 'is-rest') {
  Write-Host 'FAIL UI spec: preview must not repeat stale geometry'
  $uiFail = $true
}
if ($uiFail) {
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  exit 1
}
Write-Host 'PASS UI spec'

Write-Host '[9/9] quit cleanup'
$closed = $first.CloseMainWindow()
if (-not $closed) {
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL quit cleanup: window did not close'
  exit 1
}
$appExited = $first.WaitForExit(8000)
Start-Sleep -Milliseconds 500
$helperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
if (-not $appExited -or $helperLeft -ne 0) {
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL quit cleanup: appExited=$appExited helperLeft=$helperLeft"
  exit 1
}
Write-Host 'PASS quit cleanup (app and helper exited)'

Write-Host 'ALL CHECKS PASSED'
exit 0
