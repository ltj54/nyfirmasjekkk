$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$secretFile = Join-Path $PSScriptRoot "local-secrets.ps1"

if (-not (Test-Path -LiteralPath $secretFile)) {
    Write-Error "Missing scripts/local-secrets.ps1. Copy scripts/local-secrets.example.ps1 and fill in APP_MAIL_PASSWORD."
}

. $secretFile

if ([string]::IsNullOrWhiteSpace($env:APP_MAIL_PASSWORD)) {
    Write-Error "APP_MAIL_PASSWORD is empty. Set it in scripts/local-secrets.ps1 before starting backend."
}

Set-Location -LiteralPath $repoRoot
& .\gradlew bootRun
