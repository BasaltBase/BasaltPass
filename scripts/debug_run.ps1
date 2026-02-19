$ErrorActionPreference = "Stop"
$Root = (Resolve-Path "$PSScriptRoot\..").Path
$BackendDir = "$Root\basaltpass-backend"
Set-Location $BackendDir
Write-Host "CWD: $BackendDir"
$env:BASALTPASS_CONFIG = ""
$env:CGO_ENABLED = "0"
go run ./cmd/basaltpass
