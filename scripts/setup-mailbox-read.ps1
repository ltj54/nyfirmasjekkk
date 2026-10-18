param([switch]$Quiet)
$ErrorActionPreference = 'Stop'
$secretsPath = Join-Path $PSScriptRoot 'local-secrets.ps1'
if (-not (Test-Path -LiteralPath $secretsPath)) {
    throw 'Mangler scripts/local-secrets.ps1.'
}
if (Select-String -LiteralPath $secretsPath -Pattern '^\s*\$env:APP_MAIL_READ_TOKEN\s*=' -Quiet) {
    throw 'APP_MAIL_READ_TOKEN finnes allerede i local-secrets.ps1. Endre den manuelt hvis du vil rotere koden.'
}

$randomBytes = [byte[]]::new(32)
$generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $generator.GetBytes($randomBytes)
} finally {
    $generator.Dispose()
}
$token = [BitConverter]::ToString($randomBytes).Replace('-', '')
[System.IO.File]::AppendAllText($secretsPath, "`r`n`$env:APP_MAIL_READ_TOKEN = `"$token`"`r`n")
Write-Host 'Tilgangskode opprettet i scripts/local-secrets.ps1. Start backend på nytt.'
if (-not $Quiet) {
    Write-Host 'Kopier denne koden til CRM-feltet når du vil lese manuelt:'
    Write-Host $token
}
