$ErrorActionPreference = 'Stop'
$roomUrl = 'http://127.0.0.1:4318'
try {
    $roomState = Invoke-RestMethod -Uri "$roomUrl/api/bootstrap" -TimeoutSec 20
    if (-not ($roomState.roles.id -contains 'researcher') -or -not $roomState.token) { throw 'This is not the AI team room service.' }
    $roomHeaders = @{ 'X-Room-Token' = $roomState.token; 'Origin' = $roomUrl }
    Invoke-RestMethod -Method Post -Uri "$roomUrl/api/shutdown" -Headers $roomHeaders -ContentType 'application/json' -Body '{}' -TimeoutSec 15 | Out-Null
    Write-Host 'AI team room stopped. Your conversation is saved.'
} catch {
    Write-Host ('Could not stop the room (it may already be closed): ' + $_.Exception.Message)
    exit 1
}
