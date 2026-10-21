param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$roomRoot = $PSScriptRoot
$roomUrl = 'http://127.0.0.1:4318'

function Test-Room {
    try {
        $roomState = Invoke-RestMethod -Uri "$roomUrl/api/state" -TimeoutSec 2
        return ($null -ne $roomState.roles -and ($roomState.roles.id -contains 'researcher') -and $null -ne $roomState.auth)
    } catch { return $false }
}

try {
    if (Test-Room) {
        if (-not $NoBrowser) { Start-Process $roomUrl }
        Write-Host 'The AI team room is already running.'
        exit 0
    }
    $roomNode = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
    if (-not $roomNode) {
        $roomBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        if (Test-Path -LiteralPath $roomBundledNode) { $roomNode = $roomBundledNode }
    }
    if (-not $roomNode) { throw 'Node.js was not found. Install the free LTS version from https://nodejs.org and run Start.cmd again.' }
    $roomData = Join-Path $roomRoot 'data'
    New-Item -ItemType Directory -Force -Path $roomData | Out-Null
    $roomScript = Join-Path $roomRoot 'server.mjs'
    $roomProcess = Start-Process -FilePath $roomNode -ArgumentList ('"' + $roomScript + '"') -WorkingDirectory $roomRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $roomData 'server.log') -RedirectStandardError (Join-Path $roomData 'server-error.log') -PassThru
    $roomStarted = $false
    for ($roomAttempt = 0; $roomAttempt -lt 30; $roomAttempt++) {
        Start-Sleep -Milliseconds 250
        if (Test-Room) { $roomStarted = $true; break }
        if ($roomProcess.HasExited) { break }
    }
    if (-not $roomStarted) { throw 'The room could not start. Another app may use port 4318. See data\server-error.log.' }
    if (-not $NoBrowser) { Start-Process $roomUrl }
    Write-Host 'AI team room started. Use Stop.cmd to close the local service.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
