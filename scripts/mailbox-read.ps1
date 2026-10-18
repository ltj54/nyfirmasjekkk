param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('list', 'read')]
    [string]$Action,

    [long]$Uid
)

$secretsPath = Join-Path $PSScriptRoot 'local-secrets.ps1'
if (-not (Test-Path -LiteralPath $secretsPath)) {
    throw 'Mangler scripts/local-secrets.ps1.'
}
. $secretsPath

if ([string]::IsNullOrWhiteSpace($env:APP_MAIL_READ_TOKEN)) {
    throw 'APP_MAIL_READ_TOKEN er ikke satt i scripts/local-secrets.ps1.'
}
if ($Action -eq 'read' -and $Uid -le 0) {
    throw 'Lesing krever en gyldig meldings-ID (Uid).'
}

$path = if ($Action -eq 'list') { 'recent?limit=10' } else { "message/$Uid" }
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/mailbox/$path" -Method Post -Headers @{
    'X-Mailbox-Token' = $env:APP_MAIL_READ_TOKEN
} -TimeoutSec 20
$response | ConvertTo-Json -Depth 5
