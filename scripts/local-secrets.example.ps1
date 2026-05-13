# Copy this file to scripts/local-secrets.ps1 and fill in local-only secrets.
# scripts/local-secrets.ps1 is ignored by Git.

$env:APP_MAIL_PASSWORD = ""

# Optional test override. Leave empty when automatic e-mail should go to the company address.
$env:APP_MAIL_TEST_RECIPIENT = ""
