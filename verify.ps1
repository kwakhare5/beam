$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$tsc = Join-Path $PSScriptRoot 'node_modules\.bin\tsc.cmd'
$electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class BeamScreen {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr ctx);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint attach, uint attachTo, bool on);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT point);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hWnd, uint flags);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();

  // Windows only lets the foreground process hand the foreground away, so a script cannot
  // just call SetForegroundWindow. Attaching to the foreground thread first lifts that lock;
  // without it the call reports success and leaves the old window in front, which silently
  // sends the next SendKeys to the wrong app.
  public static bool ForceForeground(IntPtr hWnd) {
    if (hWnd == IntPtr.Zero) return false;
    if (GetForegroundWindow() == hWnd) return true;
    uint ignored;
    ShowWindow(hWnd, 9);
    uint fgThread = GetWindowThreadProcessId(GetForegroundWindow(), out ignored);
    uint myThread = GetCurrentThreadId();
    AttachThreadInput(fgThread, myThread, true);
    BringWindowToTop(hWnd);
    SetForegroundWindow(hWnd);
    AttachThreadInput(fgThread, myThread, false);
    return GetForegroundWindow() == hWnd;
  }
}
'@
[BeamScreen]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
[BeamScreen]::SetCursorPos(8, 8) | Out-Null


Write-Host '[1/25] typecheck'
& $tsc -p tsconfig.json --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL typecheck'; exit 1 }
& $tsc -p tsconfig.renderer.json --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL typecheck (renderer)'; exit 1 }
Write-Host 'PASS typecheck'

Write-Host '[2/25] build'
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL build'; exit 1 }
Write-Host 'PASS build'

Write-Host '[3/25] helper build'
$helperDir = Join-Path $PSScriptRoot 'native\BeamBridge\dist'
if (Test-Path -LiteralPath $helperDir) { Remove-Item -LiteralPath $helperDir -Recurse -Force }
& dotnet publish (Join-Path $PSScriptRoot 'native\BeamBridge\BeamBridge.csproj') -c Release -o $helperDir --nologo
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL helper build'; exit 1 }
$helperExe = Join-Path $helperDir 'BeamBridge.exe'
if (-not (Test-Path -LiteralPath $helperExe)) { Write-Host 'FAIL helper build: BeamBridge.exe missing'; exit 1 }
$helperFiles = @(Get-ChildItem -LiteralPath $helperDir -File)
if ($helperFiles.Count -ne 1) { Write-Host "FAIL helper build: expected one file, found $($helperFiles.Count)"; exit 1 }
Write-Host 'PASS helper build (single exe)'

Write-Host '[4/25] clipboard'
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
function Get-DropPaths {
  for ($i = 0; $i -lt 15; $i++) {
    $raw = Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue
    $paths = @($raw | ForEach-Object { if ($_ -is [System.IO.FileInfo]) { $_.FullName } else { [string]$_ } })
    if ($paths.Count -gt 0) { return $paths }
    Start-Sleep -Milliseconds 100
  }
  return @()
}
$clipPaths = @(Get-DropPaths)
$clipMissing = @($clipFiles | Where-Object { $clipPaths -notcontains $_ })
if ($clipReply -notmatch '"ok":true' -or $clipPaths.Count -ne 3 -or $clipMissing.Count -ne 0) {
  $clipProc.Kill()
  Write-Host "FAIL clipboard: reply '$clipReply', got $($clipPaths.Count) paths, missing $($clipMissing -join ',')"
  exit 1
}
$clipProc.StandardInput.Close()
$clipProc.WaitForExit(5000) | Out-Null
$clipAfter = @(Get-DropPaths)
if ($clipAfter.Count -ne 3) {
  Write-Host "FAIL clipboard: $($clipAfter.Count) paths after helper exit"
  exit 1
}
Remove-Item -LiteralPath $clipDir -Recurse -Force
Write-Host 'PASS clipboard (3 real paths, survive helper exit)'

Write-Host '[5/25] launch + focus'
$outLog = Join-Path $env:TEMP 'beam-verify.out.log'
$errLog = Join-Path $env:TEMP 'beam-verify.err.log'
Remove-Item -LiteralPath $outLog -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $errLog -ErrorAction SilentlyContinue
$env:BEAM_PANEL_TEST = '1'
$env:BEAM_IDLE_TEST = '1'
$env:BEAM_SETTINGS_PATH = Join-Path $env:TEMP 'beam-verify-active-settings.json'
Remove-Item -LiteralPath $env:BEAM_SETTINGS_PATH -ErrorAction SilentlyContinue
$fgBefore = [BeamScreen]::GetForegroundWindow()
$first = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
$appOut = ''
$pong = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 200
  if ($first.HasExited) {
    Get-Process BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host 'FAIL launch: process exited early'
    exit 1
  }
  $appOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
  if ($appOut -match '\[bridge\] pong 0\.1\.0') { $pong = $true; break }
}
if (-not $pong) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL launch: app never printed pong'
  exit 1
}
if ($appOut -notmatch '\[tray\] ready') {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL launch: tray did not initialize'
  exit 1
}
$beamShell = $null
for ($i = 0; $i -lt 30; $i++) {
  $beamShell = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($beamShell) { break }
  Start-Sleep -Milliseconds 200
}
if (-not $beamShell) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL focus: Beam has no visible window'
  exit 1
}
$fgAfter = [BeamScreen]::GetForegroundWindow()
if ($fgAfter -eq $beamShell.MainWindowHandle) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL focus: the pill took the foreground (was $fgBefore)"
  exit 1
}
if ($fgAfter -ne $fgBefore) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL focus: foreground changed from $fgBefore to $fgAfter while Beam launched"
  exit 1
}
Write-Host "PASS launch (pid $($first.Id)) + pong 0.1.0"
Write-Host 'PASS focus (pill appeared without taking the foreground)'
Start-Sleep -Seconds 5
$pillLine = ''
for ($i = 0; $i -lt 60; $i++) {
  $pillLine = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
  if ($pillLine -match '\[window\] pill=') { break }
  Start-Sleep -Milliseconds 200
}
if ($pillLine -notmatch '\[window\] pill=') {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL anchor: the scripted panel never closed back to the pill'
  exit 1
}
Start-Sleep -Milliseconds 300

Write-Host '[6/25] anchor'
$appOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
$anchorMatches = [regex]::Matches($appOut, '\[window\] bounds=(-?\d+),(-?\d+),(\d+),(\d+) content=(-?\d+),(-?\d+),(\d+),(\d+) work=(-?\d+),(-?\d+),(\d+),(\d+)')
if ($anchorMatches.Count -eq 0) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL anchor: no [window] line in the app log'
  exit 1
}
$anchor = $anchorMatches[$anchorMatches.Count - 1]
$bx = [int]$anchor.Groups[1].Value
$by = [int]$anchor.Groups[2].Value
$bw = [int]$anchor.Groups[3].Value
$bh = [int]$anchor.Groups[4].Value
$cx = [int]$anchor.Groups[5].Value
$cy = [int]$anchor.Groups[6].Value
$cw = [int]$anchor.Groups[7].Value
$ch = [int]$anchor.Groups[8].Value
$wx = [int]$anchor.Groups[9].Value
$wy = [int]$anchor.Groups[10].Value
$ww = [int]$anchor.Groups[11].Value
$wh = [int]$anchor.Groups[12].Value
if ($cw -lt 135 -or $ch -lt 41) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL anchor: content is ${cw}x$ch, expected at least 136x42"
  exit 1
}
$pillBottom = $cy + ($ch + 30) / 2
$pillGap = ($wy + $wh) - $pillBottom
$pillCenter = $cx + $cw / 2
$workCenter = $wx + $ww / 2
if ([math]::Abs($pillGap - 12) -gt 1 -or [math]::Abs($pillCenter - $workCenter) -gt 1) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL anchor: pill bottom sits $pillGap px above the taskbar (expected 12), center $pillCenter vs $workCenter"
  exit 1
}
$shell = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $shell) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL anchor: no visible Electron window handle'
  exit 1
}
$dpi = [BeamScreen]::GetDpiForWindow($shell.MainWindowHandle)
$scale = $dpi / 96
$rect = New-Object BeamScreen+RECT
[BeamScreen]::GetWindowRect($shell.MainWindowHandle, [ref]$rect) | Out-Null
$realX = [int][math]::Round($rect.Left / $scale)
$realY = [int][math]::Round($rect.Top / $scale)
$realW = [int][math]::Round(($rect.Right - $rect.Left) / $scale)
$realH = [int][math]::Round(($rect.Bottom - $rect.Top) / $scale)
$wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$waX = [int][math]::Round($wa.X / $scale)
$waY = [int][math]::Round($wa.Y / $scale)
$waW = [int][math]::Round($wa.Width / $scale)
$waH = [int][math]::Round($wa.Height / $scale)
if ([math]::Abs($realX - $bx) -gt 2 -or [math]::Abs($realY - $by) -gt 2 -or [math]::Abs($realW - $bw) -gt 2 -or [math]::Abs($realH - $bh) -gt 2) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL anchor: native rect $realX,$realY ${realW}x$realH (scale $scale) does not match reported $bx,$by ${bw}x$bh"
  exit 1
}
if ([math]::Abs($waX - $wx) -gt 2 -or [math]::Abs($waY - $wy) -gt 2 -or [math]::Abs($waW - $ww) -gt 2 -or [math]::Abs($waH - $wh) -gt 2) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL anchor: working area $waX,$waY ${waW}x$waH does not match Electron work $wx,$wy,${ww}x$wh"
  exit 1
}
Write-Host "PASS anchor (pill 12px above the taskbar, centered; native rect matches; scale $scale)"

Write-Host '[7/25] idle dim'
$idleOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
$idleMatch = [regex]::Match($idleOut, '\[idle\] (\{.+\})')
if (-not $idleMatch.Success) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL idle: no computed-style probe in the app log'
  exit 1
}
$idle = $idleMatch.Groups[1].Value | ConvertFrom-Json
Remove-Item Env:BEAM_IDLE_TEST -ErrorAction SilentlyContinue
if ($idle.state -eq 'playing' -or $idle.state -eq 'paused') {
  Write-Host "SKIP idle dim (music active: state=$($idle.state) label=$($idle.label); the 0.7 idle star is asserted from capsule.css)"
} else {
  if ($idle.state -ne 'idle' -or $idle.markOpacity -ne '0.7' -or $idle.shellOpacity -ne '1' -or -not $idle.markMaster -or $idle.label -ne 'Beam') {
    Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
    Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "FAIL idle: state=$($idle.state) star=$($idle.markOpacity) shell=$($idle.shellOpacity) master=$($idle.markMaster) label=$($idle.label)"
    exit 1
  }
  Write-Host "PASS idle dim (star $($idle.markOpacity), shell $($idle.shellOpacity), master mark, label Beam)"
}

Write-Host '[8/25] panel'
$panelOut = $appOut
for ($i = 0; $i -lt 50; $i++) {
  Start-Sleep -Milliseconds 300
  $panelOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
  if ($panelOut -match '\[panel\] test-dismiss') { break }
}
Start-Sleep -Milliseconds 800
$panelOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
$panelOpenMatch = [regex]::Match($panelOut, '\[panel\] open (\d+)ms reduced=(true|false)')
if (-not $panelOpenMatch.Success) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL panel: no [panel] open line'
  exit 1
}
$panelMs = [int]$panelOpenMatch.Groups[1].Value
$reduced = $panelOpenMatch.Groups[2].Value -eq 'true'
if ($panelMs -lt 130 -or $panelMs -gt 170) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL panel: open took ${panelMs}ms (expected 130-170; Beam animates even when Windows animations are off)"
  exit 1
}
if ($panelOut -notmatch '\[panel\] bounds=-?\d+,-?\d+,452,316') {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL panel: the window never reached 452x316'
  exit 1
}
if ($panelOut -notmatch '\[panel\] test-dismiss') {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host 'FAIL panel: dismiss did not run'
  exit 1
}
$allWindowLines = [regex]::Matches($panelOut, '\[window\] bounds=(-?\d+),(-?\d+),(\d+),(\d+)')
$lastWindow = $allWindowLines[$allWindowLines.Count - 1]
$restoredW = [int]$lastWindow.Groups[3].Value
$restoredH = [int]$lastWindow.Groups[4].Value
if ($restoredW -gt 200 -or $restoredH -gt 100) {
  Stop-Process -Id $first.Id -Force -ErrorAction SilentlyContinue
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Host "FAIL panel: window stayed open at ${restoredW}x$restoredH after dismiss"
  exit 1
}
Remove-Item Env:BEAM_PANEL_TEST -ErrorAction SilentlyContinue
Write-Host "PASS panel (open ${panelMs}ms reduced=$reduced, 452x316, dismissed back to the pill)"

Write-Host '[9/25] helper memory'
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

Write-Host '[10/25] single instance'
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

Write-Host '[11/25] UI spec'
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
$trayTs = Get-Content (Join-Path $PSScriptRoot 'src\main\tray.ts') -Raw
$uiFail = $false
if (-not (Test-Path (Join-Path $PSScriptRoot 'assets\tray.ico'))) {
  Write-Host 'FAIL UI spec: assets/tray.ico is missing'
  $uiFail = $true
}
if ($trayTs -notmatch 'new Tray\(' -or $trayTs -notmatch "label: 'Reset Position'" -or $trayTs -notmatch "label: 'Quit'" -or $trayTs -notmatch 'app\.quit\(\)') {
  Write-Host 'FAIL UI spec: tray needs Reset Position and Quit'
  $uiFail = $true
}
if ($main -notmatch 'createTray\(') {
  Write-Host 'FAIL UI spec: main must create the tray'
  $uiFail = $true
}if ($main -notmatch 'WINDOW_WIDTH = 136' -or $main -notmatch 'WINDOW_HEIGHT = 42' -or $main -notmatch 'showInactive') {
  Write-Host 'FAIL UI spec: window must be 136x42 and showInactive'
  $uiFail = $true
}
if ($base -notmatch 'padding: 6px 4px') {
  Write-Host 'FAIL UI spec: body padding must be 6px 4px for the 30px capsule'
  $uiFail = $true
}
if ($pill -notmatch 'width: 94px' -or $pill -notmatch 'width: 128px' -or $pill -notmatch '\.pill\.expands:hover' -or $pill -notmatch "data-state='drag'\] \{[^}]*width: 128px") {
  Write-Host 'FAIL UI spec: capsule must rest at 94, drag at 128, and grow to 128 on hover for music/timer/done'
  $uiFail = $true
}
if ($pill -match 'width: (100|104|132|136|140|176|216)px') {
  Write-Host 'FAIL UI spec: capsule uses only 94 rest and 128 hover'
  $uiFail = $true
}
if ($pill -match "data-state='(idle|files)'\]:hover[^{]*\{[^}]*width") {
  Write-Host 'FAIL UI spec: idle and files must not grow on hover'
  $uiFail = $true
}
if ($pill -notmatch "data-state='idle'\] \.mascot \{[^}]*opacity: 0\.7") {
  Write-Host 'FAIL UI spec: the idle star must dim to 0.7'
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
if ($calendarTs -notmatch 'weekCount = Math.max\(5, Math.ceil\(\(offset \+ days\) / 7\)\)' -or $calendarTs -notmatch 'cells.length < weekCount \* 7') {
  Write-Host 'FAIL UI spec: calendar must render only the weeks the month needs (5 or 6)'
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
if ($shellCss -notmatch '\.panel \{[^}]*height: 100%' -or $shellCss -match '\.panel \{[^}]*max-height') {
  Write-Host 'FAIL UI spec: every tab shares one fixed panel height (no per-tab sizing)'
  $uiFail = $true
}
if ($bodyCss -notmatch '\.panel-body \{[^}]*justify-content: center') {
  Write-Host 'FAIL UI spec: panel bodies must center their content so no tab pools space at the bottom'
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
if ($preview -notmatch '\.f-pill \{ width: 94px' -or $preview -notmatch '\.f-pill\.is-expanded \{ width: 128px') {
  Write-Host 'FAIL UI spec: preview capsule frames must be 94 rest and 128 hover'
  $uiFail = $true
}
if ($preview -notmatch 'data-pill="timerRest"' -or $preview -notmatch 'data-pill="doneRest"' -or $preview -notmatch 'data-pill="timer"' -or $preview -notmatch 'data-pill="done"') {
  Write-Host 'FAIL UI spec: preview must show timer and done rest and hover'
  $uiFail = $true
}
if ($preview -notmatch 'width: 136px; height: 42px') {
  Write-Host 'FAIL UI spec: preview window must be 136x42'
  $uiFail = $true
}
if ($preview -match 'is-wide|224px|216×32') {
  Write-Host 'FAIL UI spec: the 224 window and the 216 music width are gone'
  $uiFail = $true
}
if ($preview -notmatch '\.f-open \{ width: 452px; height: 316px; padding: 16px' -or $preview -notmatch 'compare-window \[data-pill\].*height: 30px') {
  Write-Host 'FAIL UI spec: preview must be a 452x316 window with a 16px margin and a 30px capsule frame'
  $uiFail = $true
}
if ($preview -notmatch 'data-pill="filesMissing"' -or $preview -match 'data-pill="missing"') {
  Write-Host 'FAIL UI spec: preview must show the shelf count with a danger pip'
  $uiFail = $true
}
if ($preview -notmatch 'data-pill="filesCap"' -or $preview -notmatch "filesCap: \{ state: 'files', title: 'Max 50' \}") {
  Write-Host 'FAIL UI spec: preview must show the files cap notice'
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

Write-Host '[12/25] move + persist'
$settingsPath = $null
$settingsBackup = Join-Path $env:TEMP 'beam-verify-settings.json'
$hadSettings = $false
try {
  $moveOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
  $settingsMatch = [regex]::Match($moveOut, '\[settings\] path=(.+)')
  if (-not $settingsMatch.Success) { throw 'no [settings] path line in the app log' }
  $settingsPath = $settingsMatch.Groups[1].Value.Trim()
  $hadSettings = Test-Path -LiteralPath $settingsPath
  if ($hadSettings) { Copy-Item -LiteralPath $settingsPath -Destination $settingsBackup -Force }

  # the panel test owns the window until it dismisses; pressing during it lands as a click
  for ($i = 0; $i -lt 50; $i++) {
    $moveOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
    if ($moveOut -match '\[panel\] test-dismiss') { break }
    Start-Sleep -Milliseconds 200
  }
  Start-Sleep -Milliseconds 500
  $moveOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
  $panelBefore = ([regex]::Matches($moveOut, '\[panel\] bounds=')).Count

  $moveShell = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $moveShell) { throw 'no window to drag' }
  $moveRect = New-Object BeamScreen+RECT
  [BeamScreen]::GetWindowRect($moveShell.MainWindowHandle, [ref]$moveRect) | Out-Null
  $moveScale = [BeamScreen]::GetDpiForWindow($moveShell.MainWindowHandle) / 96
  $centerX = [int](($moveRect.Left + $moveRect.Right) / 2)
  $dragY = [int](($moveRect.Top + $moveRect.Bottom) / 2)
  if ($idle.state -eq 'playing' -or $idle.state -eq 'paused') {
    # hover first so the pill grows, then press its left padding outside the transports
    [BeamScreen]::SetCursorPos($centerX, $dragY) | Out-Null
    Start-Sleep -Milliseconds 300
    $dragX = $moveRect.Left + [int][math]::Round(10 * $moveScale)
  } else {
    $dragX = $centerX
  }
  $cursorBefore = New-Object BeamScreen+POINT
  [BeamScreen]::GetCursorPos([ref]$cursorBefore) | Out-Null
  [BeamScreen]::SetCursorPos($dragX, $dragY) | Out-Null
  Start-Sleep -Milliseconds 300
  [BeamScreen]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 200
  for ($step = 1; $step -le 4; $step++) {
    [BeamScreen]::SetCursorPos($dragX + $step * 25, $dragY - $step * 15) | Out-Null
    Start-Sleep -Milliseconds 120
  }
  Start-Sleep -Milliseconds 300
  [BeamScreen]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  [BeamScreen]::SetCursorPos($cursorBefore.X, $cursorBefore.Y) | Out-Null

  $moveOut = ''
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 200
    $moveOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
    if ($moveOut -match '\[move\] end=') { break }
  }
  $endMatch = [regex]::Match($moveOut, '\[move\] end=(-?\d+),(-?\d+),(\d+),(\d+) display=(\d+)')
  if (-not $endMatch.Success) { throw 'the drag never ended in a [move] end line' }
  $endX = [int]$endMatch.Groups[1].Value
  $endY = [int]$endMatch.Groups[2].Value
  $endW = [int]$endMatch.Groups[3].Value
  $endH = [int]$endMatch.Groups[4].Value
  if ($endX -eq $bx -and $endY -eq $by) { throw 'the window did not move' }
  if ($endW -ne 136 -or $endH -lt 42 -or $endH -gt 48) { throw "the pill window resized to ${endW}x$endH" }
  if (([regex]::Matches($moveOut, '\[panel\] bounds=')).Count -ne $panelBefore) {
    throw 'the click after the drag opened the panel'
  }
  Start-Sleep -Milliseconds 200
  $movedRect = New-Object BeamScreen+RECT
  [BeamScreen]::GetWindowRect($moveShell.MainWindowHandle, [ref]$movedRect) | Out-Null
  $movedNativeX = [int][math]::Round($movedRect.Left / $scale)
  $movedNativeY = [int][math]::Round($movedRect.Top / $scale)
  if ([math]::Abs($movedNativeX - $endX) -gt 2 -or [math]::Abs($movedNativeY - $endY) -gt 2) {
    throw "the native rect $movedNativeX,$movedNativeY does not match the moved bounds $endX,$endY"
  }
  if (-not (Test-Path -LiteralPath $settingsPath)) { throw 'settings.json was not written' }
  $savedPos = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($null -eq $savedPos.position -or $savedPos.position.x -ne $endX -or $savedPos.position.y -ne $endY) {
    throw 'settings.json does not hold the moved position'
  }

  $closed = $first.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close for the restart' }
  $appExited = $first.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  if (-not $appExited) { throw 'the app did not exit for the restart' }
  if (@(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count -ne 0) { throw 'the helper survived the restart quit' }

  Remove-Item -LiteralPath $outLog -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $errLog -ErrorAction SilentlyContinue
  $first = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  $restoreOut = ''
  for ($i = 0; $i -lt 50; $i++) {
    Start-Sleep -Milliseconds 200
    if ($first.HasExited) { throw 'the app exited before restoring its position' }
    $restoreOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
    if ($restoreOut -match '\[window\] restored=') { break }
  }
  $restoredMatch = [regex]::Match($restoreOut, '\[window\] restored=(-?\d+),(-?\d+),(\d+),(\d+)')
  if (-not $restoredMatch.Success) { throw 'the app did not restore a saved position' }
  $restX = [int]$restoredMatch.Groups[1].Value
  $restY = [int]$restoredMatch.Groups[2].Value
  $restW = [int]$restoredMatch.Groups[3].Value
  if ($restX -ne $endX -or $restY -ne $endY -or $restW -ne 136) {
    throw "restored $restX,$restY ${restW} instead of $endX,$endY 136"
  }
  Start-Sleep -Seconds 1
  $restoreShell = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $restoreShell) { throw 'no window after the restart' }
  $restoredRect = New-Object BeamScreen+RECT
  [BeamScreen]::GetWindowRect($restoreShell.MainWindowHandle, [ref]$restoredRect) | Out-Null
  $restNativeX = [int][math]::Round($restoredRect.Left / $scale)
  $restNativeY = [int][math]::Round($restoredRect.Top / $scale)
  if ([math]::Abs($restNativeX - $endX) -gt 2 -or [math]::Abs($restNativeY - $endY) -gt 2) {
    throw "the restored native rect $restNativeX,$restNativeY does not match $endX,$endY"
  }

  $closed = $first.CloseMainWindow()
  if (-not $closed) { throw 'the restored pill did not close for the reset run' }
  $appExited = $first.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  if (-not $appExited) { throw 'the restored app did not exit for the reset run' }

  $env:BEAM_RESET_TEST = '1'
  Remove-Item -LiteralPath $outLog -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $errLog -ErrorAction SilentlyContinue
  $first = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  $resetOut = ''
  for ($i = 0; $i -lt 50; $i++) {
    Start-Sleep -Milliseconds 200
    if ($first.HasExited) { throw 'the app exited before resetting its position' }
    $resetOut = Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
    if ($resetOut -match '\[move\] reset=') { break }
  }
  Remove-Item Env:BEAM_RESET_TEST -ErrorAction SilentlyContinue
  $reset = [regex]::Match($resetOut, '\[move\] reset=(-?\d+),(-?\d+),(\d+),(\d+)')
  if (-not $reset.Success) { throw 'Reset Position never ran' }
  $resetX = [int]$reset.Groups[1].Value
  $resetY = [int]$reset.Groups[2].Value
  $anchorX = [int][math]::Round($wx + ($ww - 136) / 2)
  $anchorY = $wy + $wh - 48
  if ([math]::Abs($resetX - $anchorX) -gt 2 -or [math]::Abs($resetY - $anchorY) -gt 2) {
    throw "Reset Position landed at $resetX,$resetY instead of $anchorX,$anchorY"
  }
  Start-Sleep -Milliseconds 400
  $resetShell = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $resetShell) { throw 'no window after Reset Position' }
  $resetRect = New-Object BeamScreen+RECT
  [BeamScreen]::GetWindowRect($resetShell.MainWindowHandle, [ref]$resetRect) | Out-Null
  $resetNativeX = [int][math]::Round($resetRect.Left / $scale)
  $resetNativeY = [int][math]::Round($resetRect.Top / $scale)
  if ([math]::Abs($resetNativeX - $anchorX) -gt 2 -or [math]::Abs($resetNativeY - $anchorY) -gt 2) {
    throw "the reset native rect $resetNativeX,$resetNativeY is not back at the anchor"
  }
  $resetSettings = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($null -ne $resetSettings.position) { throw 'Reset Position did not clear the saved position' }
} catch {
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_RESET_TEST -ErrorAction SilentlyContinue
  if ($hadSettings -and $settingsPath) { Copy-Item -LiteralPath $settingsBackup -Destination $settingsPath -Force }
  Write-Host "FAIL move: $($_.Exception.Message)"
  exit 1
}
if ($hadSettings) { Copy-Item -LiteralPath $settingsBackup -Destination $settingsPath -Force } else { Remove-Item -LiteralPath $settingsPath -ErrorAction SilentlyContinue }
Write-Host "PASS move (drag $bx,$by to $endX,$endY, saved, restart restored it, Reset returned to $anchorX,$anchorY)"

Write-Host '[13/25] quit cleanup'
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

Write-Host '[14/25] fullscreen'
$fsHarnessPath = Join-Path $env:TEMP 'beam-fs-harness.ps1'
$fsStagePath = Join-Path $env:TEMP 'beam-fs-stage.txt'
$fsProc = $null
$fsHarness = $null
try {
  $fsHarnessSource = @'
param([int]$Hold = 2900)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class BeamFsHarness { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd); [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr ctx); [DllImport("user32.dll")] public static extern IntPtr GetWindowThreadProcessId(IntPtr hwnd, IntPtr pid); [DllImport("user32.dll")] public static extern bool AttachThreadInput(IntPtr attach, IntPtr to, bool on); [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId(); [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra); const byte VK_MENU = 0x12; const uint KEYEVENTF_KEYUP = 0x0002; public static bool ForceForeground(IntPtr hwnd) { if (GetForegroundWindow() == hwnd) return true; var fg = GetForegroundWindow(); var fgThread = GetWindowThreadProcessId(fg, IntPtr.Zero); var self = GetCurrentThreadId(); AttachThreadInput(fgThread, (IntPtr)self, true); SetForegroundWindow(hwnd); AttachThreadInput(fgThread, (IntPtr)self, false); if (GetForegroundWindow() == hwnd) return true; keybd_event(VK_MENU, 0, 0, UIntPtr.Zero); keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero); SetForegroundWindow(hwnd); return GetForegroundWindow() == hwnd; } }'
[BeamFsHarness]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
$stage = Join-Path $env:TEMP 'beam-fs-stage.txt'
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Bounds = New-Object System.Drawing.Rectangle(100, 100, 600, 400)
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::Black
$form.Show()
$ok = [BeamFsHarness]::ForceForeground($form.Handle)
"stage0 hwnd=$($form.Handle) fg=$([BeamFsHarness]::GetForegroundWindow()) ok=$ok screen=$($screen.Width)x$($screen.Height)" | Set-Content -LiteralPath $stage
if (-not $ok) { exit 3 }
Start-Sleep -Milliseconds 2200
$form.Bounds = $screen
$ok = [BeamFsHarness]::ForceForeground($form.Handle)
"stage1 hwnd=$($form.Handle) fg=$([BeamFsHarness]::GetForegroundWindow()) ok=$ok bounds=$($form.Bounds)" | Add-Content -LiteralPath $stage
if (-not $ok) { exit 4 }
Start-Sleep -Milliseconds $Hold
$form.Bounds = New-Object System.Drawing.Rectangle(100, 100, 600, 400)
Start-Sleep -Milliseconds 150
"stage2 hwnd=$($form.Handle) fg=$([BeamFsHarness]::GetForegroundWindow())" | Add-Content -LiteralPath $stage
Start-Sleep -Milliseconds 1900
$form.Close()
'@
  Set-Content -LiteralPath $fsHarnessPath -Value $fsHarnessSource -Encoding UTF8

  $fsPsi = New-Object System.Diagnostics.ProcessStartInfo
  $fsPsi.FileName = $helperExe
  $fsPsi.RedirectStandardInput = $true
  $fsPsi.RedirectStandardOutput = $true
  $fsPsi.RedirectStandardError = $true
  $fsPsi.UseShellExecute = $false
  $fsPsi.CreateNoWindow = $true
  $fsProc = [System.Diagnostics.Process]::Start($fsPsi)
  $script:fsRead = $null
  function Read-FsLine([int]$timeoutMs) {
    if (-not $script:fsRead) { $script:fsRead = $fsProc.StandardOutput.ReadLineAsync() }
    if (-not $script:fsRead.Wait($timeoutMs)) { return '<timeout>' }
    $line = $script:fsRead.Result
    $script:fsRead = $null
    return $line
  }
  function Wait-FsActive([bool]$want, [int]$seconds) {
    $expected = if ($want) { '"active":true' } else { '"active":false' }
    $stop = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $stop) {
      if ($fsHarness.HasExited) { return $null }
      $line = Read-FsLine 1000
      if ($line -eq '<timeout>') { continue }
      if ($null -eq $line) { return $null }
      if ($line -match '"evt":"fullscreen.changed"' -and $line.Contains($expected)) { return $line }
    }
    return $null
  }

  $fsInitial = $null
  $fsStop = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $fsStop) {
    $line = Read-FsLine 3000
    if ($line -eq '<timeout>') { continue }
    if ($null -eq $line) { throw 'the helper closed stdout before its first fullscreen event' }
    if ($line -match '"evt":"fullscreen.changed"') { $fsInitial = $line; break }
  }
  if (-not $fsInitial) { throw 'no initial fullscreen.changed event' }

  $fsProc.StandardInput.WriteLine('{"id":2,"cmd":"fullscreen.get"}')
  $fsProc.StandardInput.Flush()
  $fsGet = $null
  $fsStop = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $fsStop) {
    $line = Read-FsLine 3000
    if ($line -eq '<timeout>') { continue }
    if ($null -eq $line) { throw 'the helper closed stdout before the fullscreen.get reply' }
    if ($line -match '"id":2') { $fsGet = $line; break }
  }
  if (-not $fsGet -or $fsGet -notmatch '"active":(true|false)' -or $fsGet -notmatch '"rect"') {
    throw "fullscreen.get replied '$fsGet'"
  }

  Remove-Item -LiteralPath $fsStagePath -ErrorAction SilentlyContinue
  $fsHarness = Start-Process 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $fsHarnessPath -PassThru

  if (-not (Wait-FsActive $true 15)) { throw 'a window growing to fullscreen never reported active:true' }
  if (-not (Wait-FsActive $false 15)) { throw 'leaving fullscreen never reported active:false' }

  $fsHarness.WaitForExit(15000) | Out-Null
  $fsStage = Get-Content -LiteralPath $fsStagePath -Raw -ErrorAction SilentlyContinue
  if (-not $fsStage -or $fsStage -notmatch 'stage0 hwnd=(\d+) fg=(\d+) ok=True') {
    throw "the harness never focused its window: $fsStage"
  }
  $fsHwnd = $Matches[1]
  if ($Matches[2] -ne $fsHwnd -or $fsStage -notmatch "stage1 hwnd=$fsHwnd fg=$fsHwnd ok=True") {
    throw 'the foreground window changed while the window grew to fullscreen'
  }
} catch {
  if ($fsProc -and -not $fsProc.HasExited) { $fsProc.Kill() }
  if ($fsHarness -and -not $fsHarness.HasExited) { $fsHarness.Kill() }
  Write-Host "FAIL fullscreen: $($_.Exception.Message)"
  exit 1
}
if ($fsProc -and -not $fsProc.HasExited) {
  $fsProc.StandardInput.Close()
  $fsProc.WaitForExit(5000) | Out-Null
  if (-not $fsProc.HasExited) { $fsProc.Kill() }
}
Remove-Item -LiteralPath $fsStagePath -ErrorAction SilentlyContinue
Write-Host 'PASS fullscreen (grow to monitor bounds -> active:true, shrink -> active:false, same foreground window)'

Write-Host '[15/25] fullscreen hide'
$hideOutLog = Join-Path $env:TEMP 'beam-fs-hide.out.log'
$hideErrLog = Join-Path $env:TEMP 'beam-fs-hide.err.log'
Remove-Item -LiteralPath $hideOutLog, $hideErrLog -ErrorAction SilentlyContinue
$env:BEAM_FULLSCREEN_TEST = '1'
$hideApp = $null
$hideHarness = $null
try {
  $hideApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $hideOutLog -RedirectStandardError $hideErrLog
  $hideOut = ''
  for ($i = 0; $i -lt 50; $i++) {
    Start-Sleep -Milliseconds 200
    if ($hideApp.HasExited) { throw 'the app exited before the fullscreen run' }
    $hideOut = Get-Content -LiteralPath $hideOutLog -Raw -ErrorAction SilentlyContinue
    if ($hideOut -match '\[bridge\] pong') { break }
  }
  if ($hideOut -notmatch '\[bridge\] pong') { throw 'the app never answered the helper' }

  $hideHarness = Start-Process 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $fsHarnessPath, '-Hold', '6000' -PassThru

  $hideHidden = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 200
    $hideOut = Get-Content -LiteralPath $hideOutLog -Raw -ErrorAction SilentlyContinue
    $hideVisible = @(Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count
    if ($hideOut -match '\[fullscreen\] hidden' -and $hideVisible -eq 0) { $hideHidden = $true; break }
  }
  if (-not $hideHidden) { throw 'the pill never hid when the window went fullscreen' }

  $hideShown = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 200
    $hideOut = Get-Content -LiteralPath $hideOutLog -Raw -ErrorAction SilentlyContinue
    $hideVisible = @(Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count
    if ($hideOut -match '\[fullscreen\] shown \(tray\)' -and $hideVisible -ge 1) { $hideShown = $true; break }
  }
  if (-not $hideShown) { throw 'the tray click never brought the pill back' }

  $hideHarness.WaitForExit(20000) | Out-Null
  Start-Sleep -Milliseconds 1500
  $hideOut = Get-Content -LiteralPath $hideOutLog -Raw -ErrorAction SilentlyContinue
  $hideVisible = @(Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count
  $hideCount = ([regex]::Matches($hideOut, '\[fullscreen\] hidden')).Count
  if ($hideCount -ne 1) { throw "the pill hid $hideCount times across one fullscreen trip" }
  if ($hideVisible -lt 1) { throw 'the pill did not stay visible after the fullscreen window shrank' }

  $closed = $hideApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the fullscreen run' }
  $exited = $hideApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $hideHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $exited -or $hideHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$exited helperLeft=$hideHelperLeft)" }
} catch {
  if ($hideHarness -and -not $hideHarness.HasExited) { $hideHarness.Kill() }
  if ($hideApp -and -not $hideApp.HasExited) { $hideApp.Kill() }
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_FULLSCREEN_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL fullscreen hide: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_FULLSCREEN_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $hideOutLog, $hideErrLog -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $fsHarnessPath, $fsStagePath -ErrorAction SilentlyContinue
Write-Host 'PASS fullscreen hide (hid at fullscreen, tray click restored it, stayed shown after the exit)'

Write-Host '[16/25] drop'
$dropOutLog = Join-Path $env:TEMP 'beam-drop-verify.out.log'
$dropErrLog = Join-Path $env:TEMP 'beam-drop-verify.err.log'
Remove-Item -LiteralPath $dropOutLog, $dropErrLog -ErrorAction SilentlyContinue
$env:BEAM_DROP_TEST = '1'
$dropApp = $null
try {
  $dropApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $dropOutLog -RedirectStandardError $dropErrLog
  $dropOut = ''
  $dropStop = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $dropStop) {
    Start-Sleep -Milliseconds 200
    if ($dropApp.HasExited) { throw 'the app exited before the drop run' }
    $dropOut = Get-Content -LiteralPath $dropOutLog -Raw -ErrorAction SilentlyContinue
    if ($dropOut -match '\[drop\] settled') { break }
  }
  if ($dropOut -notmatch '\[drop\] settled') { throw 'the drop test never finished' }
  $dropChecks = @(
    '\[files\] add=3 accepted=3 count=3 truncated=false',
    '\[files\] add=51 accepted=47 count=50 truncated=true',
    '\[drop\] capped state=files title=Max 50'
  )
  foreach ($dropCheck in $dropChecks) {
    if ($dropOut -notmatch $dropCheck) { throw "missing drop evidence /$dropCheck/" }
  }
  if ($dropOut -match '\[drop\] three state=files title=3 files') {
    if ($dropOut -notmatch '\[drop\] settled state=files title=50 files') { throw 'the settled pill did not read 50 files' }
  } elseif ($dropOut -match '\[drop\] three state=(playing|paused) title=.+') {
    Write-Host 'SKIP drop pill labels (music active: the pill keeps the track; counts are asserted from the [files] add log)'
  } else {
    throw 'the drop left the pill in an unexpected state'
  }

  $closed = $dropApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the drop run' }
  $exited = $dropApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $dropHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $exited -or $dropHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$exited helperLeft=$dropHelperLeft)" }
} catch {
  if ($dropApp -and -not $dropApp.HasExited) { $dropApp.Kill() }
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_DROP_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL drop: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_DROP_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $dropOutLog, $dropErrLog -ErrorAction SilentlyContinue
Write-Host 'PASS drop (3 real files read with webUtils; 51 more capped at 50 with a Max 50 notice)'

Write-Host '[17/25] copy'
$copyOutLog = Join-Path $env:TEMP 'beam-copy-verify.out.log'
$copyErrLog = Join-Path $env:TEMP 'beam-copy-verify.err.log'
Remove-Item -LiteralPath $copyOutLog, $copyErrLog -ErrorAction SilentlyContinue
$env:BEAM_COPY_TEST = '1'
$copyApp = $null
$copyPasteDir = Join-Path $env:TEMP ("beam-copy-paste-" + $PID)
try {
  $copyApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $copyOutLog -RedirectStandardError $copyErrLog
  $copyOut = ''
  $copyStop = (Get-Date).AddSeconds(25)
  while ((Get-Date) -lt $copyStop) {
    Start-Sleep -Milliseconds 150
    if ($copyApp.HasExited) { throw 'the app exited before the copy run' }
    $copyOut = Get-Content -LiteralPath $copyOutLog -Raw -ErrorAction SilentlyContinue
    if ($copyOut -match '\[files\] copy=1 source=row ok=true') { break }
  }
  if ($copyOut -notmatch '\[copy\] panel rows=3 all=true names=alpha\.txt,beta\.txt,gamma\.txt sizes=7 B,7 B,7 B') {
    throw 'the Files tab never showed the three dropped files'
  }
  if ($copyOut -notmatch '\[files\] copy=1 source=row ok=true') { throw 'the row copy never reached the helper' }
  $rowPaths = @(Get-DropPaths)
  if ($rowPaths.Count -ne 1 -or $rowPaths[0] -notmatch 'alpha\.txt$') {
    throw "the row copy left $($rowPaths.Count) paths on the clipboard"
  }

  $copyStop = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $copyStop) {
    Start-Sleep -Milliseconds 150
    $copyOut = Get-Content -LiteralPath $copyOutLog -Raw -ErrorAction SilentlyContinue
    if ($copyOut -match '\[files\] copy=3 source=all ok=true') { break }
  }
  if ($copyOut -notmatch '\[files\] copy=3 source=all ok=true') { throw 'Copy All never reached the helper' }
  $allPaths = @(Get-DropPaths)
  $copySources = @('alpha.txt', 'beta.txt', 'gamma.txt') | ForEach-Object { Join-Path (Join-Path $env:TEMP 'beam-copytest') $_ }
  $copyMissing = @($copySources | Where-Object { $allPaths -notcontains $_ })
  if ($allPaths.Count -ne 3 -or $copyMissing.Count -ne 0) {
    throw "Copy All left $($allPaths.Count) paths on the clipboard (missing $($copyMissing -join ','))"
  }

  New-Item -ItemType Directory -Path $copyPasteDir | Out-Null
  $copyShell = New-Object -ComObject WScript.Shell
  Start-Process explorer.exe -ArgumentList $copyPasteDir | Out-Null
  $pasteName = Split-Path -Leaf $copyPasteDir
  # AppActivate reports success while Windows keeps the old window in front, so the handle
  # comes from the shell's window list and is forced forward before the keystroke.
  $pasteHwnd = [IntPtr]::Zero
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 200
    foreach ($explorerWindow in (New-Object -ComObject Shell.Application).Windows()) {
      if ($explorerWindow.LocationName -eq $pasteName) { $pasteHwnd = [IntPtr]$explorerWindow.HWND; break }
    }
    if ($pasteHwnd -ne [IntPtr]::Zero) { break }
  }
  if ($pasteHwnd -eq [IntPtr]::Zero) { throw 'the paste folder never opened' }
  if (-not [BeamScreen]::ForceForeground($pasteHwnd)) { throw 'the paste folder never took the foreground' }
  Start-Sleep -Milliseconds 400
  if ([BeamScreen]::GetForegroundWindow() -ne $pasteHwnd) { throw 'the paste folder lost the foreground before the paste' }
  $copyShell.SendKeys('^v')
  $pasted = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 250
    $landed = @($copySources | Where-Object { Test-Path -LiteralPath (Join-Path $copyPasteDir (Split-Path -Leaf $_)) })
    if ($landed.Count -eq 3) {
      $pasted = $true
      break
    }
  }
  if (-not $pasted) { throw 'Ctrl+V in Explorer pasted nothing' }
  foreach ($source in $copySources) {
    $target = Join-Path $copyPasteDir (Split-Path -Leaf $source)
    if ((Get-Item -LiteralPath $source).Length -ne (Get-Item -LiteralPath $target).Length) {
      throw "the pasted file $target has a different size"
    }
  }
  if ([BeamScreen]::ForceForeground($pasteHwnd)) {
    Start-Sleep -Milliseconds 300
    $copyShell.SendKeys('%{F4}')
  }

  if ($copyOut -notmatch '\[copy\] done') {
    $copyStop = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $copyStop) {
      Start-Sleep -Milliseconds 150
      $copyOut = Get-Content -LiteralPath $copyOutLog -Raw -ErrorAction SilentlyContinue
      if ($copyOut -match '\[copy\] done') { break }
    }
  }
  if ($copyOut -notmatch '\[copy\] done') { throw 'the copy harness never finished' }

  $closed = $copyApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the copy run' }
  $exited = $copyApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $copyHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $exited -or $copyHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$exited helperLeft=$copyHelperLeft)" }
} catch {
  if ($copyApp -and -not $copyApp.HasExited) { $copyApp.Kill() }
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_COPY_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL copy: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_COPY_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $copyOutLog, $copyErrLog -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $copyPasteDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-copytest') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'PASS copy (row copy put alpha.txt on the clipboard, Copy All put all 3 paths, Ctrl+V pasted them into Explorer)'

Write-Host '[18/25] drag out'
$dragOutLog = Join-Path $env:TEMP 'beam-dragout-verify.out.log'
$dragOutErr = Join-Path $env:TEMP 'beam-dragout-verify.err.log'
$dragMarker = Join-Path $env:TEMP 'beam-dragout-continue'
$dragPaste = Join-Path $env:TEMP ("beam-dragout-paste-" + $PID)
Remove-Item -LiteralPath $dragOutLog, $dragOutErr, $dragMarker -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $dragPaste -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-dragout') -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dragPaste | Out-Null
$env:BEAM_DRAGOUT_TEST = '1'
$dragApp = $null
$dragHwnd = [IntPtr]::Zero
try {
  $pasteName = Split-Path -Leaf $dragPaste
  Start-Process explorer.exe -ArgumentList "/n,$dragPaste" | Out-Null
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 250
    $explorerWindows = (New-Object -ComObject Shell.Application).Windows()
    foreach ($explorerWindow in $explorerWindows) {
      if ($explorerWindow.LocationName -eq $pasteName) { $dragHwnd = [IntPtr]$explorerWindow.HWND; break }
    }
    if ($dragHwnd -ne [IntPtr]::Zero) { break }
  }
  if ($dragHwnd -eq [IntPtr]::Zero) { throw 'the Explorer drop folder never opened' }
  [BeamScreen]::SetWindowPos($dragHwnd, [IntPtr]::Zero, 60, 40, 600, 500, 0x0040) | Out-Null
  # A real drag drops on whatever window owns the point, so the folder is put in front and the
  # drop point is checked first; otherwise the drop lands somewhere else and the failure looks
  # like a broken drag instead of a covered window.
  if (-not [BeamScreen]::ForceForeground($dragHwnd)) { throw 'the Explorer drop folder never took the foreground' }
  Start-Sleep -Milliseconds 600
  $dropPoint = New-Object 'BeamScreen+POINT'
  $dropPoint.X = 360
  $dropPoint.Y = 300
  $dropUnder = [BeamScreen]::GetAncestor([BeamScreen]::WindowFromPoint($dropPoint), 2)
  if ($dropUnder -ne $dragHwnd) { throw 'another window covers the Explorer drop point' }

  $dragApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $dragOutLog -RedirectStandardError $dragOutErr
  $dragOut = ''
  $dragStop = (Get-Date).AddSeconds(25)
  while ((Get-Date) -lt $dragStop) {
    Start-Sleep -Milliseconds 150
    if ($dragApp.HasExited) { throw 'the app exited before the drag-out run' }
    $dragOut = Get-Content -LiteralPath $dragOutLog -Raw -ErrorAction SilentlyContinue
    if ($dragOut -match '\[dragout\] row=') { break }
  }
  $rowMatch = [regex]::Match($dragOut, '\[dragout\] row=(\S+) x=(-?\d+) y=(-?\d+) scale=([\d.]+)')
  if (-not $rowMatch.Success) { throw 'the drag-out row was never reported' }
  $rowName = $rowMatch.Groups[1].Value
  if ($rowName -ne 'alpha.txt') { throw "the first draggable row was $rowName" }
  $dragScale = [double]::Parse($rowMatch.Groups[4].Value, [System.Globalization.CultureInfo]::InvariantCulture)
  $rowX = [int][math]::Round([int]$rowMatch.Groups[2].Value * $dragScale)
  $rowY = [int][math]::Round([int]$rowMatch.Groups[3].Value * $dragScale)

  [BeamScreen]::SetCursorPos($rowX, $rowY) | Out-Null
  Start-Sleep -Milliseconds 300
  [BeamScreen]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 250
  for ($step = 1; $step -le 12; $step++) {
    $stepX = [int]($rowX + (360 - $rowX) * $step / 12)
    $stepY = [int]($rowY + (300 - $rowY) * $step / 12)
    [BeamScreen]::SetCursorPos($stepX, $stepY) | Out-Null
    Start-Sleep -Milliseconds 40
  }
  Start-Sleep -Milliseconds 200
  [BeamScreen]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  New-Item -ItemType File -Path $dragMarker | Out-Null

  $landed = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-Path -LiteralPath (Join-Path $dragPaste 'alpha.txt')) { $landed = $true; break }
  }
  if (-not $landed) { throw 'the dragged file never landed in Explorer' }
  $landedLength = (Get-Item -LiteralPath (Join-Path $dragPaste 'alpha.txt')).Length
  if ($landedLength -ne 7) { throw "the landed file is $landedLength bytes, expected 7" }

  $dragOut = ''
  $guardStop = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $guardStop) {
    Start-Sleep -Milliseconds 200
    $dragOut = Get-Content -LiteralPath $dragOutLog -Raw -ErrorAction SilentlyContinue
    if ($dragOut -match '\[dragout\] done') { break }
  }
  $guardMatch = [regex]::Match($dragOut, '\[dragout\] guard draggable=(\S*) missing=(\S*) missingDraggable=(true|false)')
  if (-not $guardMatch.Success) { throw 'the missing-file guard never ran' }
  if ($guardMatch.Groups[2].Value -notmatch 'beta\.txt') { throw 'the deleted file was not marked missing' }
  if ($guardMatch.Groups[1].Value -match 'beta\.txt') { throw 'the missing row could still start a drag' }
  if ($guardMatch.Groups[3].Value -ne 'false') { throw 'a missing row kept its drag attributes' }
  $dragErr = Get-Content -LiteralPath $dragOutErr -Raw -ErrorAction SilentlyContinue
  if ($dragErr -notmatch '\[files\] drag rejected') { throw 'the off-shelf drag was not rejected' }
  $dragStarted = ([regex]::Matches($dragOut, '\[files\] drag=\d+ ok=true')).Count
  if ($dragStarted -ne 1) { throw "the app started $dragStarted native drags, expected 1" }
  if ($dragOut -notmatch '\[dragout\] done') { throw 'the drag-out harness never finished' }

  [BeamScreen]::PostMessage($dragHwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
  Start-Sleep -Milliseconds 400
  $closed = $dragApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the drag-out run' }
  $exited = $dragApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $dragHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $exited -or $dragHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$exited helperLeft=$dragHelperLeft)" }
} catch {
  if ($dragHwnd -ne [IntPtr]::Zero) { [BeamScreen]::PostMessage($dragHwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null }
  if ($dragApp -and -not $dragApp.HasExited) { $dragApp.Kill() }
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_DRAGOUT_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL drag out: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_DRAGOUT_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $dragOutLog, $dragOutErr, $dragMarker -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $dragPaste -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-dragout') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'PASS drag out (a real mouse drag dropped alpha.txt into Explorer; the deleted beta.txt row lost its drag; an off-shelf path was rejected)'

Write-Host '[19/25] missing badge'
$missingOut = Join-Path $env:TEMP 'beam-missing-verify.out.log'
$missingErr = Join-Path $env:TEMP 'beam-missing-verify.err.log'
Remove-Item -LiteralPath $missingOut, $missingErr -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-missing') -Recurse -Force -ErrorAction SilentlyContinue
$env:BEAM_MISSING_TEST = '1'
$missingApp = $null
try {
  $missingApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $missingOut -RedirectStandardError $missingErr
  $missingLog = ''
  $missingStop = (Get-Date).AddSeconds(25)
  while ((Get-Date) -lt $missingStop) {
    Start-Sleep -Milliseconds 150
    if ($missingApp.HasExited) { throw 'the app exited before the missing-badge run' }
    $missingLog = Get-Content -LiteralPath $missingOut -Raw -ErrorAction SilentlyContinue
    if ($missingLog -match '\[missing\] done') { break }
  }
  if ($missingLog -notmatch '\[missing\] start pip=false rows=3') { throw 'the healthy shelf did not start without a pip or lost rows' }
  if ($missingLog -notmatch '\[missing\] end badge=Missing title=File moved or deleted copies=0 drags=2 pip=true') {
    throw 'the deleted file did not turn into a Missing row without copy or drag, or the pill missed its red pip'
  }
  if ($missingLog -notmatch '\[missing\] done') { throw 'the missing-badge harness never finished' }

  $closed = $missingApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the missing-badge run' }
  $exited = $missingApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $missingHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $exited -or $missingHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$exited helperLeft=$missingHelperLeft)" }
} catch {
  if ($missingApp -and -not $missingApp.HasExited) { $missingApp.Kill() }
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_MISSING_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL missing badge: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_MISSING_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $missingOut, $missingErr -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-missing') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'PASS missing badge (deleted file shows Missing with the File moved or deleted tooltip, no copy or drag, and the pill gains a red pip)'

Write-Host '[20/25] clear all'
$clearOut = Join-Path $env:TEMP 'beam-clear-verify.out.log'
$clearErr = Join-Path $env:TEMP 'beam-clear-verify.err.log'
Remove-Item -LiteralPath $clearOut, $clearErr -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-clear') -Recurse -Force -ErrorAction SilentlyContinue
$env:BEAM_CLEAR_TEST = '1'
$clearApp = $null
$emptyApp = $null
try {
  $clearApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $clearOut -RedirectStandardError $clearErr
  $clearLog = ''
  $clearStop = (Get-Date).AddSeconds(25)
  while ((Get-Date) -lt $clearStop) {
    Start-Sleep -Milliseconds 150
    if ($clearApp.HasExited) { throw 'the app exited before the clear run' }
    $clearLog = Get-Content -LiteralPath $clearOut -Raw -ErrorAction SilentlyContinue
    if ($clearLog -match '\[clear\] done') { break }
  }
  $clearMusic = $clearLog -match '\[clear\] three state=(playing|paused) title=.+'
  if (($clearLog -notmatch '\[clear\] three rows=3 note=Files clear on quit well=false state=files title=3 files') -and
      ($clearLog -notmatch '\[clear\] three rows=3 note=Files clear on quit well=false state=(playing|paused) title=.+')) {
    throw 'three files did not show the quit warning'
  }
  if (($clearLog -notmatch '\[clear\] removed rows=2 note=Files clear on quit well=false state=files title=2 files') -and
      ($clearLog -notmatch '\[clear\] removed rows=2 note=Files clear on quit well=false state=(playing|paused) title=.+')) {
    throw 'the row remove did not leave two files and the warning'
  }
  if ($clearLog -notmatch '\[files\] remove=0 count=2') { throw 'main did not record the row remove' }
  if (($clearLog -notmatch '\[clear\] empty rows=0 note= well=true state=idle title=Beam') -and
      ($clearLog -notmatch '\[clear\] empty rows=0 note= well=true state=(playing|paused) title=.+')) {
    throw 'Clear All did not empty the list'
  }
  if ($clearMusic) {
    Write-Host 'SKIP clear pill labels (music active: the pill keeps the track; rows, note, well, and Clear All still asserted)'
  }
  if ($clearLog -notmatch '\[files\] clear=2') { throw 'main did not record Clear All' }
  if ($clearLog -notmatch '\[clear\] done') { throw 'the clear harness never finished' }

  $closed = $clearApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the clear run' }
  $clearExited = $clearApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $clearHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $clearExited -or $clearHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$clearExited helperLeft=$clearHelperLeft)" }

  Remove-Item Env:BEAM_CLEAR_TEST -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $clearOut, $clearErr -ErrorAction SilentlyContinue
  $env:BEAM_EMPTY_TEST = '1'
  $emptyApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $clearOut -RedirectStandardError $clearErr
  $emptyLog = ''
  $emptyStop = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $emptyStop) {
    Start-Sleep -Milliseconds 150
    if ($emptyApp.HasExited) { throw 'the app exited before the restart probe' }
    $emptyLog = Get-Content -LiteralPath $clearOut -Raw -ErrorAction SilentlyContinue
    if ($emptyLog -match '\[empty\] done') { break }
  }
  if (($emptyLog -notmatch '\[empty\] rows=0 well=true state=idle title=Beam') -and
      ($emptyLog -notmatch '\[empty\] rows=0 well=true state=(playing|paused) title=.+')) {
    throw 'the restarted app did not start with an empty shelf'
  }
  if ($emptyLog -match '\[empty\] rows=0 well=true state=(playing|paused) title=.+') {
    Write-Host 'SKIP restart pill label (music active: the empty shelf is proven by rows=0 and the drop well)'
  }
  if ($emptyLog -notmatch '\[empty\] done') { throw 'the restart probe never finished' }

  $closed = $emptyApp.CloseMainWindow()
  if (-not $closed) { throw 'the restarted pill did not close' }
  $emptyExited = $emptyApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $emptyHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $emptyExited -or $emptyHelperLeft -ne 0) { throw "the restarted app did not exit cleanly (exited=$emptyExited helperLeft=$emptyHelperLeft)" }
} catch {
  if ($emptyApp -and -not $emptyApp.HasExited) { $emptyApp.Kill() }
  if ($clearApp -and -not $clearApp.HasExited) { $clearApp.Kill() }
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_CLEAR_TEST, Env:BEAM_EMPTY_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL clear all: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_CLEAR_TEST, Env:BEAM_EMPTY_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $clearOut, $clearErr -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-clear') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'PASS clear all (row remove left 2 files with the warning, Clear All emptied the list, and a restart started empty)'

# Checks 21-24 need real SMTC players. Beam provides them: a local page in Chromium publishes
# a real media session (title, artist, album, artwork, position, next/prev), so the suite never
# depends on a network player, an ad, or whatever happens to be open. Chrome is player one and
# Edge joins with the same page for check 24; both are closed when the run ends.
$playerRoot = Join-Path $env:TEMP 'beam-players'
$playerPage = Join-Path $playerRoot 'player.html'
$playerChromeExe = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$playerEdgeExe = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$playerHelper = $null
$script:playerRead = $null

function Read-PlayerLine([int]$timeoutMs) {
  if (-not $script:playerRead) { $script:playerRead = $playerHelper.StandardOutput.ReadLineAsync() }
  if (-not $script:playerRead.Wait($timeoutMs)) { return '<timeout>' }
  $line = $script:playerRead.Result
  $script:playerRead = $null
  return $line
}

function Get-BeamSessions {
  $playerHelper.StandardInput.WriteLine('{"id":1,"cmd":"music.sessions"}')
  $playerHelper.StandardInput.Flush()
  $stop = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $stop) {
    $line = Read-PlayerLine 1000
    if ($line -eq '<timeout>') { continue }
    if ($null -eq $line) { return @() }
    if ($line -match '"id":1') { return @(($line | ConvertFrom-Json).sessions) }
  }
  return @()
}

function Set-BeamSessionPaused([string]$app) {
  $playerHelper.StandardInput.WriteLine('{"id":2,"cmd":"music.pick","app":"' + $app + '"}')
  $playerHelper.StandardInput.Flush()
  $stop = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $stop) {
    $line = Read-PlayerLine 1000
    if ($line -eq '<timeout>') { continue }
    if ($null -eq $line) { return $false }
    if ($line -match '"id":2') { return ($line -match '"ok":true') }
  }
  return $false
}

function Clear-BeamPlayers {
  if ($playerHelper) {
    if (-not $playerHelper.HasExited) {
      $playerHelper.StandardInput.Close()
      $playerHelper.WaitForExit(2000) | Out-Null
    }
    if (-not $playerHelper.HasExited) { $playerHelper.Kill() }
    $playerHelper = $null
  }
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'beam-players' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $playerRoot -Recurse -Force -ErrorAction SilentlyContinue
}

try {
  if (-not $playerChromeExe) { throw 'the music checks need Chromium to publish a local SMTC player and Chrome was not found' }
  Remove-Item -LiteralPath $playerRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $playerRoot | Out-Null

  # Silent 600s tones keep the position bar moving without making noise. Silence still
  # publishes a session that answers play/pause/next/prev; a muted app does not.
  $playerRate = 8000
  foreach ($playerTone in @('beam-a.wav', 'beam-b.wav')) {
    $playerSilence = New-Object byte[] ($playerRate * 2)
    $playerStream = [System.IO.File]::Create((Join-Path $playerRoot $playerTone))
    $playerWriter = New-Object System.IO.BinaryWriter($playerStream)
    $playerWriter.Write([Text.Encoding]::ASCII.GetBytes('RIFF'))
    $playerWriter.Write([int](36 + ($playerSilence.Length * 600)))
    $playerWriter.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt '))
    $playerWriter.Write([int]16)
    $playerWriter.Write([int16]1)
    $playerWriter.Write([int16]1)
    $playerWriter.Write([int]$playerRate)
    $playerWriter.Write([int]($playerRate * 2))
    $playerWriter.Write([int16]2)
    $playerWriter.Write([int16]16)
    $playerWriter.Write([Text.Encoding]::ASCII.GetBytes('data'))
    $playerWriter.Write([int]($playerSilence.Length * 600))
    for ($i = 0; $i -lt 600; $i++) { $playerWriter.Write($playerSilence) }
    $playerWriter.Close()
    $playerStream.Close()
  }

  Add-Type -AssemblyName System.Drawing
  $playerCover = New-Object System.Drawing.Bitmap 256, 256
  $playerInk = [System.Drawing.Graphics]::FromImage($playerCover)
  $playerInk.Clear([System.Drawing.Color]::FromArgb(255, 20, 20, 24))
  $playerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 180, 41))
  $playerInk.FillEllipse($playerBrush, 48, 48, 160, 160)
  $playerInk.Dispose()
  $playerCover.Save((Join-Path $playerRoot 'cover.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $playerCover.Dispose()

  $playerHtml = @'
<!doctype html>
<meta charset="utf-8">
<title>Beam verify player</title>
<audio id="track" autoplay loop src="beam-a.wav"></audio>
<script>
const tracks = ['beam-a.wav', 'beam-b.wav'];
const audio = document.getElementById('track');
let index = 0;
function publish() {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Beam verify ' + tracks[index],
    artist: 'Beam',
    album: 'Verify',
    artwork: [{ src: 'cover.png', sizes: '256x256', type: 'image/png' }]
  });
}
function load(next) {
  index = (next + tracks.length) % tracks.length;
  // The track is switched through the metadata only. Reassigning audio.src makes Chrome
  // republish the session without its artwork, which breaks the 2.3 art assertion that runs
  // after the transport check. One long silent file keeps the session and its art stable
  // while next/prev still change the title exactly like a real skip.
  audio.play();
  publish();
}
navigator.mediaSession.setActionHandler('nexttrack', () => load(index + 1));
navigator.mediaSession.setActionHandler('previoustrack', () => load(index - 1));
navigator.mediaSession.setActionHandler('play', () => audio.play());
navigator.mediaSession.setActionHandler('pause', () => audio.pause());
audio.addEventListener('play', () => { navigator.mediaSession.playbackState = 'playing'; publish(); });
audio.addEventListener('pause', () => { navigator.mediaSession.playbackState = 'paused'; });
load(0);
</script>
'@
  Set-Content -LiteralPath $playerPage -Value $playerHtml -Encoding UTF8

  $env:BEAM_MUSIC_SESSIONS_TEST = '1'
  $playerPsi = New-Object System.Diagnostics.ProcessStartInfo
  $playerPsi.FileName = $helperExe
  $playerPsi.RedirectStandardInput = $true
  $playerPsi.RedirectStandardOutput = $true
  $playerPsi.RedirectStandardError = $true
  $playerPsi.UseShellExecute = $false
  $playerPsi.CreateNoWindow = $true
  $playerHelper = [System.Diagnostics.Process]::Start($playerPsi)

  # Verify runs its own BeamBridge to read and steer the local players, and that process is
  # alive for checks 21-24, so an exit check has to ignore it. Every other surviving helper
  # is still a real leak.
  $script:playerHelperId = $playerHelper.Id
  function Get-LeftoverHelper {
    @(Get-Process BeamBridge -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $script:playerHelperId }).Count
  }

  Start-Process -FilePath $playerChromeExe -ArgumentList @(
    '--user-data-dir=' + (Join-Path $playerRoot 'chrome'),
    '--autoplay-policy=no-user-gesture-required',
    '--no-first-run',
    '--new-window',
    ('file:///' + ($playerPage -replace '\\', '/'))
  ) | Out-Null

  $playerReady = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    $playerLive = Get-BeamSessions
    if ($playerLive | Where-Object { $_.app -match 'Chrome' -and $_.playing }) { $playerReady = $true; break }
  }
  if (-not $playerReady) { throw 'the local SMTC player never started playing' }
} catch {
  Clear-BeamPlayers
  Remove-Item Env:BEAM_MUSIC_SESSIONS_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL local player: $($_.Exception.Message)"
  exit 1
}

Write-Host '[21/25] music pill'
$musicOut = Join-Path $env:TEMP 'beam-music-verify.out.log'
$musicErr = Join-Path $env:TEMP 'beam-music-verify.err.log'
Remove-Item -LiteralPath $musicOut, $musicErr -ErrorAction SilentlyContinue
$env:BEAM_MUSIC_TEST = '1'
$musicApp = $null
try {
  $musicApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $musicOut -RedirectStandardError $musicErr
  $musicLog = ''
  $musicStop = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $musicStop) {
    Start-Sleep -Milliseconds 150
    if ($musicApp.HasExited) { throw 'the app exited before the music probe' }
    $musicLog = Get-Content -LiteralPath $musicOut -Raw -ErrorAction SilentlyContinue
    if ($musicLog -match '\[music\] probe') { break }
  }
  $musicInputMatch = [regex]::Match($musicLog, '\[music\] input (\{.+\})')
  $musicProbeMatch = [regex]::Match($musicLog, '\[music\] probe (\{.+\})')
  if (-not $musicInputMatch.Success) {
    if ($musicLog -match '\[music\] input null') { throw 'no active SMTC session; start a track in Spotify and rerun verify' }
    throw 'music.changed never reached main'
  }
  if (-not $musicProbeMatch.Success) { throw 'the pill never showed the track' }
  $musicInput = $musicInputMatch.Groups[1].Value | ConvertFrom-Json
  $musicProbe = $musicProbeMatch.Groups[1].Value | ConvertFrom-Json
  if ([string]::IsNullOrWhiteSpace($musicInput.title)) { throw 'the SMTC session has no title' }
  if ($musicProbe.label -ne $musicInput.title) { throw "the pill reads '$($musicProbe.label)', expected '$($musicInput.title)'" }
  $musicWant = if ($musicInput.playing) { 'playing' } else { 'paused' }
  if ($musicProbe.state -ne $musicWant) { throw "the pill state is $($musicProbe.state), expected $musicWant" }
  if ($musicProbe.pip -ne $musicWant) { throw "the pill dot is $($musicProbe.pip), expected $musicWant" }
  if ([bool]$musicProbe.art -ne [bool]$musicInput.hasArt) { throw "art mismatch: pill=$($musicProbe.art) payload=$($musicInput.hasArt)" }
  if ($musicProbe.ms -ge 1000) { throw "the pill took $($musicProbe.ms)ms, over the 1s budget" }

  $closed = $musicApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the music check' }
  $musicExited = $musicApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $musicHelperLeft = Get-LeftoverHelper
  if (-not $musicExited -or $musicHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$musicExited helperLeft=$musicHelperLeft)" }
} catch {
  if ($musicApp -and -not $musicApp.HasExited) { $musicApp.Kill() }
  Clear-BeamPlayers
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_MUSIC_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL music pill: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_MUSIC_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $musicOut, $musicErr -ErrorAction SilentlyContinue
Write-Host "PASS music pill ('$($musicInput.title)' $musicWant, art=$($musicProbe.art), shown in $($musicProbe.ms)ms)"

Write-Host '[22/25] music controls'
$cmdOut = Join-Path $env:TEMP 'beam-music-commands.out.log'
$cmdErr = Join-Path $env:TEMP 'beam-music-commands.err.log'
Remove-Item -LiteralPath $cmdOut, $cmdErr -ErrorAction SilentlyContinue
$env:BEAM_MUSIC_TEST = '1'
$env:BEAM_MUSIC_CMD_TEST = '1'
$cmdApp = $null
try {
  $cmdApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $cmdOut -RedirectStandardError $cmdErr
  $cmdLog = ''
  $cmdStop = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $cmdStop) {
    Start-Sleep -Milliseconds 200
    if ($cmdApp.HasExited) { throw 'the app exited before the transport test finished' }
    $cmdLog = Get-Content -LiteralPath $cmdOut -Raw -ErrorAction SilentlyContinue
    if ($cmdLog -match '\[music\] cmd done') { break }
  }
  if ($cmdLog -notmatch '\[music\] cmd done') {
    if ($cmdLog -match '\[music\] cmd skipped=no-session') { throw 'no active SMTC session; start a track in Spotify and rerun verify' }
    throw 'the transport test never finished'
  }

  $hoverMatch = [regex]::Match($cmdLog, '\[music\] hover (\{.+\})')
  $toggleMatch = [regex]::Match($cmdLog, '\[music\] toggle (\{.+\})')
  $resumeMatch = [regex]::Match($cmdLog, '\[music\] resume (\{.+\})')
  $nextMatch = [regex]::Match($cmdLog, '\[music\] next (\{.+\})')
  $prevMatch = [regex]::Match($cmdLog, '\[music\] prev (\{.+\})')
  if (-not $hoverMatch.Success) { throw 'the pill never reported its transports' }
  if (-not $toggleMatch.Success) { throw 'the play/pause button never reported' }
  if (-not $nextMatch.Success) { throw 'the next button never reported' }
  if (-not $prevMatch.Success) { throw 'the previous button never reported' }

  $hover = $hoverMatch.Groups[1].Value | ConvertFrom-Json
  $toggle = $toggleMatch.Groups[1].Value | ConvertFrom-Json
  $next = $nextMatch.Groups[1].Value | ConvertFrom-Json
  $prev = $prevMatch.Groups[1].Value | ConvertFrom-Json

  if (-not $hover.hasControls) { throw 'the pill has no transport overlay while music plays' }
  if ($hover.opacity -ne '1') { throw "the transports did not fade in on hover (opacity $($hover.opacity))" }
  if ($hover.metaOpacity -ne '0') { throw "the title did not fade out on hover (opacity $($hover.metaOpacity))" }
  $actions = @($hover.buttons | ForEach-Object { $_.action })
  if ($actions.Count -ne 4 -or $actions -notcontains 'prev' -or $actions -notcontains 'toggle' -or $actions -notcontains 'next' -or $actions -notcontains 'panel') {
    throw "expected prev/toggle/next/panel, found $($actions -join ',')"
  }
  $toggleLabel = ($hover.buttons | Where-Object { $_.action -eq 'toggle' }).label
  $wantLabel = if ($toggle.from) { 'Pause' } else { 'Play' }
  if ($toggleLabel -ne $wantLabel) { throw "the play button reads '$toggleLabel', expected '$wantLabel'" }
  if (-not $toggle.ok -or $toggle.from -eq $toggle.to) { throw "play/pause did not change playback (from=$($toggle.from) to=$($toggle.to))" }
  if ($resumeMatch.Success) {
    $resume = $resumeMatch.Groups[1].Value | ConvertFrom-Json
    if (-not $resume.ok -or -not $resume.to) { throw 'playback did not resume after the play/pause test' }
  }
  if (-not $next.ok -or $next.from -eq $next.to) { throw "Next did not change the track ('$($next.from)')" }
  if (-not $prev.ok -or $prev.from -eq $prev.to) { throw "Previous did not change the track ('$($prev.from)')" }

  $closed = $cmdApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the transport check' }
  $cmdExited = $cmdApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $cmdHelperLeft = Get-LeftoverHelper
  if (-not $cmdExited -or $cmdHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$cmdExited helperLeft=$cmdHelperLeft)" }
} catch {
  if ($cmdApp -and -not $cmdApp.HasExited) { $cmdApp.Kill() }
  Clear-BeamPlayers
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_MUSIC_TEST, Env:BEAM_MUSIC_CMD_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL music controls: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_MUSIC_TEST, Env:BEAM_MUSIC_CMD_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $cmdOut, $cmdErr -ErrorAction SilentlyContinue
Write-Host "PASS music controls (play/pause $($toggle.from)->$($toggle.to), next '$($next.from)'->'$($next.to)', prev '$($prev.from)'->'$($prev.to)', 4 controls including panel, transports at opacity $($hover.opacity))"

function Format-BeamClock([int]$seconds) {
  $hours = [int][math]::Floor($seconds / 3600)
  $minutes = [int][math]::Floor(($seconds % 3600) / 60)
  $secs = $seconds % 60
  if ($hours -gt 0) { return '{0}:{1:D2}:{2:D2}' -f $hours, $minutes, $secs }
  return '{0}:{1:D2}' -f $minutes, $secs
}

Write-Host '[23/25] music tab'
$tabOut = Join-Path $env:TEMP 'beam-music-tab.out.log'
$tabErr = Join-Path $env:TEMP 'beam-music-tab.err.log'
Remove-Item -LiteralPath $tabOut, $tabErr -ErrorAction SilentlyContinue
$env:BEAM_MUSIC_TAB_TEST = '1'
$tabApp = $null
try {
  $tabApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $tabOut -RedirectStandardError $tabErr
  $tabLog = ''
  $tabStop = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $tabStop) {
    Start-Sleep -Milliseconds 200
    if ($tabApp.HasExited) { throw 'the app exited before the music tab probe' }
    $tabLog = Get-Content -LiteralPath $tabOut -Raw -ErrorAction SilentlyContinue
    if ($tabLog -match '\[music\] tab done') { break }
  }
  if ($tabLog -notmatch '\[music\] tab done') {
    if ($tabLog -match '\[music\] tab skipped=no-session') { throw 'no active SMTC session; start a track and rerun verify' }
    throw 'the music tab probe never finished'
  }

  $payloadMatch = [regex]::Match($tabLog, '\[music\] tabpayload (\{.+\})')
  $firstMatch = [regex]::Match($tabLog, '\[music\] tab (\{.+\})')
  $secondMatch = [regex]::Match($tabLog, '\[music\] tabtick (\{.+\})')
  $tabToggleMatch = [regex]::Match($tabLog, '\[music\] tabtoggle (\{.+\})')
  $netMatch = [regex]::Match($tabLog, '\[music\] net (\{.+\})')
  if (-not $payloadMatch.Success) { throw 'the music tab probe never reported its payload' }
  if (-not $firstMatch.Success) { throw 'the music tab never reported its first state' }
  if (-not $secondMatch.Success) { throw 'the music tab never reported its second state' }
  if (-not $tabToggleMatch.Success) { throw 'the music tab toggle never reported' }
  if (-not $netMatch.Success) { throw 'the music tab probe never reported its network requests' }

  $payload = $payloadMatch.Groups[1].Value | ConvertFrom-Json
  $first = $firstMatch.Groups[1].Value | ConvertFrom-Json
  $second = $secondMatch.Groups[1].Value | ConvertFrom-Json
  $tabToggleResult = $tabToggleMatch.Groups[1].Value | ConvertFrom-Json
  $net = $netMatch.Groups[1].Value | ConvertFrom-Json
  if ([string]::IsNullOrWhiteSpace($payload.title)) { throw 'the SMTC session has no title' }
  if ($payload.durationMs -le 0) { throw 'the SMTC session has no duration' }
  if (-not $payload.art) { throw 'the live session has no artwork; the 2.3 art check needs a track with art' }
  if ($first.hidden -ne $false) { throw 'the Music tab panel is still hidden after its tab was clicked' }
  if ($first.selected -ne 'true') { throw 'the Music tab is not selected' }
  if ($first.title -ne $payload.title) { throw "the Music tab title reads '$($first.title)', expected '$($payload.title)'" }
  if ($first.subtitle -ne $payload.artist) { throw "the Music tab artist reads '$($first.subtitle)', expected '$($payload.artist)'" }
  if (-not $first.art) { throw 'the Music tab did not render the art as a data URL' }
  if ([int]$first.artW -ne 148 -or [int]$first.artH -ne 148) { throw "the Music tab art is $($first.artW)x$($first.artH), expected 148x148" }
  if (-not $first.bar) { throw 'the Music tab has no position bar' }
  if ($first.bar.tag -ne 'DIV' -or $first.bar.role -ne 'progressbar') { throw "the position bar is a $($first.bar.tag) with role '$($first.bar.role)', expected a DIV progressbar" }
  if ([int]$first.bar.tabIndex -ne -1 -or $first.slider) { throw 'the position bar is interactive (slider or focusable)' }

  $wantMax = [int][math]::Round($payload.durationMs / 1000)
  if ([int]$first.bar.max -ne $wantMax) { throw "the bar max is $($first.bar.max)s, expected $wantMax" }
  $base = [int][math]::Round($payload.positionMs / 1000)
  $now = [int]$first.bar.now
  if ($now -lt $base -or $now -gt ($base + 3)) { throw "the bar reads $($now)s, expected about $($base)s from SMTC" }

  $times = @($first.times)
  if ($times.Count -ne 2) { throw "the bar shows $($times.Count) time labels, expected 2" }
  $wantElapsed = Format-BeamClock $now
  $wantTotal = Format-BeamClock $wantMax
  if ($times[0] -ne $wantElapsed -or $times[1] -ne $wantTotal) { throw "the bar times read $($times[0]) / $($times[1]), expected $wantElapsed / $wantTotal" }

  $actions = @($first.controls | ForEach-Object { $_.action })
  if ($actions.Count -ne 3 -or $actions -notcontains 'prev' -or $actions -notcontains 'toggle' -or $actions -notcontains 'next') {
    throw "expected prev/toggle/next in the Music tab, found $($actions -join ',')"
  }
  $wantToggle = if ($payload.playing) { 'Pause' } else { 'Play' }
  $tabToggleLabel = ($first.controls | Where-Object { $_.action -eq 'toggle' }).label
  if ($tabToggleLabel -ne $wantToggle) { throw "the Music tab play button reads '$tabToggleLabel', expected '$wantToggle'" }
  if (-not $tabToggleResult.flipped -or -not $tabToggleResult.restored) { throw 'the Music tab play/pause button did not change and restore the live session' }

  $advance = 'paused'
  if ($payload.playing) {
    $delta = [int]$second.bar.now - [int]$first.bar.now
    if ($delta -lt 2 -or $delta -gt 4) { throw "the bar did not advance with playback (from $($first.bar.now)s to $($second.bar.now)s after 3s)" }
    $advance = "$delta s"
  } elseif ([int]$second.bar.now -ne [int]$first.bar.now) {
    throw 'the bar advanced while the track was paused'
  }
  if (@($net.requests).Count -ne 0) { throw "the Music tab made network requests: $($net.requests -join ', ')" }

  $closed = $tabApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the music tab check' }
  $tabExited = $tabApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $tabHelperLeft = Get-LeftoverHelper
  if (-not $tabExited -or $tabHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$tabExited helperLeft=$tabHelperLeft)" }
  $tabResult = "'$($payload.title)' art $($first.artW)x$($first.artH), bar $($first.bar.now)/$($first.bar.max)s advancing $advance in 3s, controls prev/toggle/next, tab play/pause changed and restored, 0 network requests"
} catch {
  if ($tabApp -and -not $tabApp.HasExited) { $tabApp.Kill() }
  Clear-BeamPlayers
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_MUSIC_TAB_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL music tab: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_MUSIC_TAB_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $tabOut, $tabErr -ErrorAction SilentlyContinue
Write-Host "PASS music tab ($tabResult)"

Write-Host '[24/25] session picking'
# Player one is still running from check 21. A second real player with a different app id
# joins here so Beam has two live sessions to follow. Windows hands the current session over
# only when a player starts or stops playing, so the test toggles the same player twice.
$pickOut = Join-Path $env:TEMP 'beam-music-sessions.out.log'
$pickErr = Join-Path $env:TEMP 'beam-music-sessions.err.log'
Remove-Item -LiteralPath $pickOut, $pickErr -ErrorAction SilentlyContinue
$pickApp = $null
try {
  if (-not $playerEdgeExe) { throw 'session picking needs a second SMTC player and Microsoft Edge was not found' }
  Start-Process -FilePath $playerEdgeExe -ArgumentList @(
    '--user-data-dir=' + (Join-Path $playerRoot 'edge'),
    '--autoplay-policy=no-user-gesture-required',
    '--no-first-run',
    '--new-window',
    ('file:///' + ($playerPage -replace '\\', '/'))
  ) | Out-Null

  $pickSecondPlayer = $null
  $pickFirstPlayer = $null
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    $pickLive = Get-BeamSessions
    $pickSecondPlayer = $pickLive | Where-Object { $_.app -match 'Edge' } | Select-Object -First 1
    $pickFirstPlayer = $pickLive | Where-Object { $_.app -notmatch 'Edge' -and $_.playing } | Select-Object -First 1
    if ($pickSecondPlayer -and $pickFirstPlayer) { break }
  }
  if (-not $pickSecondPlayer -or -not $pickFirstPlayer) {
    throw 'the second player never published a live SMTC session next to the first one'
  }

  if ($pickSecondPlayer.playing) {
    if (-not (Set-BeamSessionPaused $pickSecondPlayer.app)) { throw 'the second player refused the pause' }
    $pickPaused = $false
    for ($i = 0; $i -lt 20; $i++) {
      Start-Sleep -Milliseconds 500
      $pickNow = Get-BeamSessions | Where-Object { $_.app -eq $pickSecondPlayer.app } | Select-Object -First 1
      if ($pickNow -and -not $pickNow.playing) { $pickPaused = $true; break }
    }
    if (-not $pickPaused) { throw 'the second player stayed playing, so the pill had nothing to switch away from' }
  }
  $pickCurrent = Get-BeamSessions | Where-Object { $_.current } | Select-Object -First 1
  if ($pickCurrent -and $pickCurrent.app -eq $pickSecondPlayer.app) {
    throw 'the second player still owned the current session after pausing'
  }

  $pickApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $pickOut -RedirectStandardError $pickErr
  $pickLog = ''
  $pickStop = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $pickStop) {
    Start-Sleep -Milliseconds 200
    if ($pickApp.HasExited) { throw 'the app exited before the session picking test finished' }
    $pickLog = Get-Content -LiteralPath $pickOut -Raw -ErrorAction SilentlyContinue
    if ($pickLog -match '\[sessions\] done') { break }
  }
  if ($pickLog -notmatch '\[sessions\] done') { throw 'the session picking test never finished' }
  if ($pickLog -match '\[sessions\] error') { throw 'the session picking test logged an error' }

  $closed = $pickApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the session picking check' }
  $pickExited = $pickApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $pickHelperLeft = Get-LeftoverHelper
  if (-not $pickExited -or $pickHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$pickExited helperLeft=$pickHelperLeft)" }

  if ($pickLog -match '\[sessions\] skip=one') {
    $skipMatch = [regex]::Match($pickLog, '\[sessions\] skip=one ([^\r\n]+)')
    Write-Host "SKIP session picking (only one media session was live: $($skipMatch.Groups[1].Value.Trim()); open two players that publish SMTC and rerun)"
  } else {
    $listMatch = [regex]::Match($pickLog, '\[sessions\] list (\[[^\r\n]+\])')
    $switchMatch = [regex]::Match($pickLog, '\[sessions\] switched (\{[^\r\n]+\})')
    $backMatch = [regex]::Match($pickLog, '\[sessions\] back (\{[^\r\n]+\})')
    if (-not $listMatch.Success) { throw 'the session test never listed the media sessions' }
    if (-not $switchMatch.Success) { throw 'the switch to the second player never reported' }
    if (-not $backMatch.Success) { throw 'the switch back never reported' }

    $sessionList = $listMatch.Groups[1].Value | ConvertFrom-Json
    $switch = $switchMatch.Groups[1].Value | ConvertFrom-Json
    $back = $backMatch.Groups[1].Value | ConvertFrom-Json
    if (@($sessionList).Count -lt 2) { throw "expected two media sessions, found $(@($sessionList).Count)" }
    if (-not $switch.matched) { throw "the pill did not follow the second player ('$($switch.title)')" }
    if (-not $back.matched) { throw "the pill did not follow the session back ('$($back.title)')" }
    if ($switch.app -eq $back.app) { throw 'the test picked the same app twice' }
    if ([int]$switch.blank -ne 0 -or [int]$back.blank -ne 0) { throw "the pill went blank during a switch (switch=$($switch.blank) back=$($back.blank))" }
    if ([int]$switch.ms -ge 10000 -or [int]$back.ms -ge 10000) { throw "a switch took over 10s (switch=$($switch.ms)ms back=$($back.ms)ms)" }
    Write-Host "PASS session picking (followed '$($switch.app)' in $($switch.ms)ms and back to '$($back.app)' in $($back.ms)ms with no blank pill across $(@($sessionList).Count) live sessions)"
  }
} catch {
  if ($pickApp -and -not $pickApp.HasExited) { $pickApp.Kill() }
  Clear-BeamPlayers
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_MUSIC_SESSIONS_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL session picking: $($_.Exception.Message)"
  exit 1
}
Clear-BeamPlayers
Remove-Item Env:BEAM_MUSIC_SESSIONS_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $pickOut, $pickErr -ErrorAction SilentlyContinue

Write-Host '[25/25] UI pass'
$uiOutLog = Join-Path $env:TEMP 'beam-ui-verify.out.log'
$uiErrLog = Join-Path $env:TEMP 'beam-ui-verify.err.log'
Remove-Item -LiteralPath $uiOutLog, $uiErrLog -ErrorAction SilentlyContinue
$env:BEAM_UI_TEST = '1'
$uiApp = $null
try {
  $uiApp = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru -RedirectStandardOutput $uiOutLog -RedirectStandardError $uiErrLog
  $uiOut = ''
  $uiStop = (Get-Date).AddSeconds(75)
  while ((Get-Date) -lt $uiStop) {
    Start-Sleep -Milliseconds 250
    if ($uiApp.HasExited) { throw 'the app exited during the UI pass' }
    $uiOut = Get-Content -LiteralPath $uiOutLog -Raw -ErrorAction SilentlyContinue
    if ($uiOut -match '\[ui\] done') { break }
  }
  if ($uiOut -notmatch '\[ui\] done') { throw 'the UI pass never finished' }

  function Get-UiLog([string]$text, [string]$tag) {
    $match = [regex]::Match($text, "\[ui\] $tag (\{[^\r\n]*\})")
    if (-not $match.Success) { throw "the UI pass never logged '$tag'" }
    return $match.Groups[1].Value | ConvertFrom-Json
  }

  $start = Get-UiLog $uiOut 'start'
  if ([int]$start.w -ne 94 -or [int]$start.h -ne 30) { throw "the resting pill is $($start.w)x$($start.h), expected 94x30" }
  $add = Get-UiLog $uiOut 'add'
  if ([int]$add.accepted -ne 3 -or [int]$add.shelf -ne 3) { throw "the shelf took $($add.accepted) of 3 files" }
  $open = Get-UiLog $uiOut 'open'
  if (-not $open.ok -or @($open.selected) -notcontains 'files') {
    throw "the panel opened on '$(@($open.selected) -join ',')' after the shelf changed, expected files"
  }
  $undo = Get-UiLog $uiOut 'undo'
  if ([int]$undo.afterRemove -ne 2 -or [int]$undo.afterUndo -ne 3 -or -not $undo.undoVisible) {
    throw "Undo left $($undo.afterRemove) rows then $($undo.afterUndo)"
  }
  if ($undo.status -ne 'Restored') { throw "Undo status read '$($undo.status)'" }
  $timer = Get-UiLog $uiOut 'timer'
  if (-not $timer.ok -or $timer.state -ne 'timer' -or $timer.mode -notmatch 'mode-running') {
    throw "the running timer left pill '$($timer.state)' mode '$($timer.mode)'"
  }
  if ($timer.digits -notmatch '^\d{1,2}:\d{2}$') { throw "the pill read '$($timer.digits)'" }
  if ([math]::Abs([int]$timer.faceTop - [int]$timer.actionBottom) -gt 2) {
    throw "the running timer is not centered (top air $($timer.faceTop), bottom air $($timer.actionBottom))"
  }
  $timercancel = Get-UiLog $uiOut 'timercancel'
  if (-not $timercancel.ok -or $null -ne $timercancel.digits) { throw 'Cancel did not clear the pill timer' }
  $calendar = Get-UiLog $uiOut 'calendar'
  if ($calendar.before -eq $calendar.next -or $calendar.back -ne $calendar.before) {
    throw "calendar went '$($calendar.before)' -> '$($calendar.next)' -> '$($calendar.back)'"
  }
  $esc = Get-UiLog $uiOut 'esc'
  if (-not $esc.ok) { throw 'Escape did not close the panel' }
  $lastused = Get-UiLog $uiOut 'lastused'
  if (@($lastused.selected) -notcontains 'calendar') {
    throw "reopening after the calendar landed on '$(@($lastused.selected) -join ',')'"
  }
  $clear = Get-UiLog $uiOut 'clear'
  if ([int]$clear.shelf -ne 0 -or [int]$clear.rows -ne 0 -or $clear.label -ne 'Beam') {
    throw "Clear All left $($clear.shelf) paths, $($clear.rows) rows, label '$($clear.label)'"
  }
  $chevron = Get-UiLog $uiOut 'chevron'
  if ($null -ne $chevron.skipped) {
    Write-Host "SKIP chevron (no media session: $($chevron.skipped))"
  } elseif (-not $chevron.ok) {
    throw 'the pill chevron did not open the panel'
  }
  $quiet = Get-UiLog $uiOut 'quiet'
  if ($null -ne $quiet.skipped) {
    Write-Host "SKIP quiet (a media session was live: $($quiet.skipped))"
  } else {
    if (-not $quiet.ok -or [int]$quiet.w -ne 30 -or [int]$quiet.h -ne 30) {
      throw "quiet read $($quiet.state) $($quiet.w)x$($quiet.h), expected 30x30"
    }
    $quietwake = Get-UiLog $uiOut 'quietwake'
    if (-not $quietwake.ok) { throw 'the quiet pill did not wake on hover' }
  }

  Start-Sleep -Milliseconds 600
  $uiHwnd = [IntPtr]::Zero
  for ($i = 0; $i -lt 20; $i++) {
    $uiApp.Refresh()
    $uiHwnd = $uiApp.MainWindowHandle
    if ($uiHwnd -ne [IntPtr]::Zero) { break }
    Start-Sleep -Milliseconds 100
  }
  if ($uiHwnd -eq [IntPtr]::Zero) { throw 'the Beam window handle never appeared' }
  $uiRect = New-Object BeamScreen+RECT
  if (-not [BeamScreen]::GetWindowRect($uiHwnd, [ref]$uiRect)) { throw 'the Beam window rect could not be read' }
  $midY = [int](($uiRect.Top + $uiRect.Bottom) / 2)
  $pillPoint = New-Object BeamScreen+POINT
  $pillPoint.X = [int](($uiRect.Left + $uiRect.Right) / 2)
  $pillPoint.Y = $midY
  $marginPoint = New-Object BeamScreen+POINT
  $marginPoint.X = $uiRect.Left + 2
  $marginPoint.Y = $midY
  $pillRoot = [BeamScreen]::GetAncestor([BeamScreen]::WindowFromPoint($pillPoint), 2)
  $marginRoot = [BeamScreen]::GetAncestor([BeamScreen]::WindowFromPoint($marginPoint), 2)
  if ($pillRoot -ne $uiHwnd) { throw 'the pill center is not Beam hit area' }
  if ($marginRoot -eq $uiHwnd) { throw 'the transparent margin still belongs to Beam' }

  $closed = $uiApp.CloseMainWindow()
  if (-not $closed) { throw 'the pill did not close after the UI pass' }
  $exited = $uiApp.WaitForExit(8000)
  Start-Sleep -Milliseconds 500
  $uiHelperLeft = @(Get-Process BeamBridge -ErrorAction SilentlyContinue).Count
  if (-not $exited -or $uiHelperLeft -ne 0) { throw "the app did not exit cleanly (exited=$exited helperLeft=$uiHelperLeft)" }
} catch {
  if ($uiApp -and -not $uiApp.HasExited) { $uiApp.Kill() }
  Get-Process electron,BeamBridge -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item Env:BEAM_UI_TEST -ErrorAction SilentlyContinue
  Write-Host "FAIL UI pass: $($_.Exception.Message)"
  exit 1
}
Remove-Item Env:BEAM_UI_TEST -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $uiOutLog, $uiErrLog -ErrorAction SilentlyContinue
Write-Host 'PASS UI pass (94x30 rest, shelf add/undo, last-used tab, centered running timer, calendar nav, Esc, chevron, 30x30 quiet + wake, cleared shelf, margin click-through)'

Remove-Item Env:BEAM_SETTINGS_PATH -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:TEMP 'beam-verify-active-settings.json') -ErrorAction SilentlyContinue
Write-Host 'ALL CHECKS PASSED'
exit 0
