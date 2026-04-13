param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [string]$SourceRef = "main",

    [string]$Branch
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    $output = & git @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    return [pscustomobject]@{
        Output = $output
        ExitCode = $exitCode
    }
}

Write-Host "[info] Starting worktree creation"

$headCheck = Invoke-Git rev-parse --verify HEAD
if ($headCheck.ExitCode -ne 0) {
    Write-Error @"
[stderr] git worktree add failed: repository has no commits yet.
Create the initial commit on '$SourceRef' before adding a worktree:
  git add .
  git commit -m "Initial commit"
"@
    exit 1
}

$sourceCheck = Invoke-Git rev-parse --verify $SourceRef
if ($sourceCheck.ExitCode -ne 0) {
    Write-Error "[stderr] git worktree add failed: source ref '$SourceRef' does not exist."
    exit 1
}

$gitArgs = @("worktree", "add")
if ($Branch) {
    $gitArgs += @("-b", $Branch)
}
$gitArgs += @($Path, $SourceRef)

$result = Invoke-Git @gitArgs
if ($result.ExitCode -ne 0) {
    Write-Error "[stderr] git worktree add failed: $($result.Output -join [Environment]::NewLine)"
    exit $result.ExitCode
}

$result.Output | ForEach-Object { Write-Host $_ }
