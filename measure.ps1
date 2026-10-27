$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'
$privateLimitMb = 130
$cpuLimitPct = 0.5
$durationSeconds = 60

function Get-ProcessTreeIds {
  param([int]$RootId)

  $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
  $ids = New-Object 'System.Collections.Generic.List[int]'
  $ids.Add($RootId)
  $added = $true

  while ($added) {
    $added = $false
    foreach ($proc in $all) {
      if (($ids -contains $proc.ParentProcessId) -and -not ($ids -contains $proc.ProcessId)) {
        $ids.Add([int]$proc.ProcessId)
        $added = $true
      }
    }
  }

  return $ids
}

function Get-TreePrivateMb {
  param($Ids)
  $procs = Get-Process -Id $Ids -ErrorAction SilentlyContinue
  if (-not $procs) { return 0 }
  return [math]::Round((($procs | Measure-Object PrivateMemorySize64 -Sum).Sum / 1MB), 1)
}

function Get-TreeRssMb {
  param($Ids)
  $procs = Get-Process -Id $Ids -ErrorAction SilentlyContinue
  if (-not $procs) { return 0 }
  return [math]::Round((($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB), 1)
}

Write-Host '[1/3] build'
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL build'; exit 1 }
Write-Host 'PASS build'

if (Get-Process electron -ErrorAction SilentlyContinue) {
  Write-Host 'FAIL another electron.exe is already running; quit it first'
  exit 1
}

Write-Host "[2/3] launch and warm up"
$app = Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $PSScriptRoot -PassThru
Start-Sleep -Seconds 5

if ($app.HasExited) {
  Write-Host 'FAIL app exited during warm-up'
  exit 1
}

$ids = Get-ProcessTreeIds -RootId $app.Id
Write-Host "Electron processes: $($ids.Count)"

$cpuStart = @{}
foreach ($proc in Get-Process -Id $ids -ErrorAction SilentlyContinue) {
  $cpuStart[$proc.Id] = $proc.TotalProcessorTime.TotalSeconds
}

Write-Host "[3/3] sampling $durationSeconds seconds at rest"
$started = Get-Date
$maxPrivateMb = 0
$sampleCount = 0

while (((Get-Date) - $started).TotalSeconds -lt $durationSeconds) {
  Start-Sleep -Seconds 5
  if ($app.HasExited) {
    Write-Host 'FAIL app exited during sampling'
    exit 1
  }
  $ids = Get-ProcessTreeIds -RootId $app.Id
  $privateMb = Get-TreePrivateMb -Ids $ids
  if ($privateMb -gt $maxPrivateMb) { $maxPrivateMb = $privateMb }
  $sampleCount++
}

$elapsed = ((Get-Date) - $started).TotalSeconds
$ids = Get-ProcessTreeIds -RootId $app.Id
$cpuEnd = @{}
$cpuUsed = 0.0

foreach ($proc in Get-Process -Id $ids -ErrorAction SilentlyContinue) {
  $now = $proc.TotalProcessorTime.TotalSeconds
  $before = 0.0
  if ($cpuStart.ContainsKey($proc.Id)) { $before = $cpuStart[$proc.Id] }
  $cpuEnd[$proc.Id] = $now
  $cpuUsed += ($now - $before)
}

$cores = [Environment]::ProcessorCount
$avgCpuPct = [math]::Round(($cpuUsed / ($elapsed * $cores)) * 100, 3)
$rssMb = Get-TreeRssMb -Ids $ids
$privateMb = Get-TreePrivateMb -Ids $ids

Write-Host ''
Write-Host "Elapsed:        $([math]::Round($elapsed, 1))s over $cores logical processors"
Write-Host "RSS total:      $rssMb MB"
Write-Host "Private total:  $privateMb MB (peak $maxPrivateMb MB; limit $privateLimitMb MB)"
Write-Host "Average CPU:    $avgCpuPct% (limit $cpuLimitPct%)"
Write-Host "Processes:      $($ids.Count)"

$failed = $false
if ($maxPrivateMb -ge $privateLimitMb) { Write-Host "FAIL memory: peak $maxPrivateMb MB is at or over $privateLimitMb MB"; $failed = $true }
if ($avgCpuPct -ge $cpuLimitPct) { Write-Host "FAIL CPU: $avgCpuPct% is at or over $cpuLimitPct%"; $failed = $true }

Write-Host 'Cleaning up'
foreach ($processId in ($ids | Sort-Object -Descending)) {
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 800
if ($app.HasExited -eq $false) { Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue }

if ($failed) {
  Write-Host 'BUDGET FAILED'
  exit 1
}

Write-Host 'BUDGET PASSED'
exit 0
