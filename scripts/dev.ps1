param (
    [string]$Command = "up"
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path "$PSScriptRoot\..").Path
$RunDir = "$Root\.basaltpass-dev"
$LogDir = "$RunDir\logs"

if (!(Test-Path $RunDir)) { New-Item -ItemType Directory -Path $RunDir | Out-Null }
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$BackendPidFile = "$RunDir\backend.pid"
$UserPidFile = "$RunDir\user.pid"
$TenantPidFile = "$RunDir\tenant.pid"
$AdminPidFile = "$RunDir\admin.pid"

$BackendLog = "$LogDir\backend.log"
$UserLog = "$LogDir\user.log"
$TenantLog = "$LogDir\tenant.log"
$AdminLog = "$LogDir\admin.log"

function Get-PidFromPort {
    param ([int]$Port)
    try {
        $proc = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
        return $proc
    } catch {
        return $null
    }
}

function Is-PidRunning {
    param ([int]$Id)
    if (!$Id) { return $false }
    return (Get-Process -Id $Id -ErrorAction SilentlyContinue) -ne $null
}

function Read-PidFile {
    param ([string]$Path)
    if (Test-Path $Path) {
        return Get-Content $Path
    }
    return $null
}

function Wait-For-Port {
    param ([int]$Port, [int]$TimeoutSeconds = 30)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $pidFound = Get-PidFromPort -Port $Port
        if ($pidFound) { return $pidFound }
        Start-Sleep -Milliseconds 500
    }
    return $null
}

function Start-Backend {
    $existing = Read-PidFile $BackendPidFile
    if (Is-PidRunning $existing) {
        Write-Host "Backend already running (pid $existing)"
        return
    }

    $portPid = Get-PidFromPort 8101
    if (Is-PidRunning $portPid) {
        Write-Host "Backend already running on :8101 (pid $portPid)"
        $portPid | Set-Content $BackendPidFile
        return
    }

    $BackendDir = "$Root\basaltpass-backend"
    if (!(Test-Path $BackendDir)) {
        Write-Error "Backend directory not found: $BackendDir"
    }
    
    Write-Host "Debug: BackendDir='$BackendDir'"
    Write-Host "Debug: LogFile='$BackendLog'"

    $GoExe = (Get-Command go -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    if (!$GoExe) {
        Write-Error "Go executable not found in PATH."
    }
    Write-Host "Found Go: $GoExe"

    Write-Host "Starting backend on :8101..."
    
    # We rely on internal discovery (./config)
    $env:BASALTPASS_CONFIG = ""
    
    # We use Start-Process to run in background
    $p = Start-Process -FilePath $GoExe -ArgumentList "run", "./cmd/basaltpass" -WorkingDirectory $BackendDir -PassThru -NoNewWindow
    
    # Wait for port
    $newPid = Wait-For-Port 8101
    if ($newPid) {
        $newPid | Set-Content $BackendPidFile
        Write-Host "Backend started (pid $newPid)"
    } else {
        # Fallback to process PID if port detection fails or takes too long
        $p.Id | Set-Content $BackendPidFile
        Write-Host "Backend process started (pid $($p.Id)), assuming it will bind :8101"
    }
}

function Start-Frontend {
    param ($Name, $PidFile, $LogFile, $NpmScript, $Port)

    $existing = Read-PidFile $PidFile
    if (Is-PidRunning $existing) {
        Write-Host "$Name already running (pid $existing)"
        return
    }

    if ($Port) {
        $portPid = Get-PidFromPort $Port
        if (Is-PidRunning $portPid) {
            Write-Host "$Name already running on :$Port (pid $portPid)"
            $portPid | Set-Content $PidFile
            return
        }
    }

    Write-Host "Starting $Name on :$Port..."
    $FrontendDir = "$Root\basaltpass-frontend"

    $NpmExe = (Get-Command npm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    if (!$NpmExe) {
        $NpmExe = (Get-Command npm -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    }
    if (!$NpmExe) {
        Write-Error "npm executable not found in PATH."
    }
    Write-Host "Found npm: $NpmExe"

    # Start npm run in background. npm.cmd is needed on Windows
    $p = Start-Process -FilePath $NpmExe -ArgumentList "run", $NpmScript -WorkingDirectory $FrontendDir -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile -PassThru -NoNewWindow

    if ($Port) {
        $newPid = Wait-For-Port $Port
        if ($newPid) {
            $newPid | Set-Content $PidFile
             Write-Host "$Name started (pid $newPid)"
        } else {
             $p.Id | Set-Content $PidFile
             Write-Host "$Name process started (pid $($p.Id))"
        }
    } else {
        $p.Id | Set-Content $PidFile
    }
}

function Stop-PidFile {
    param ($Name, $Path)
    $id = Read-PidFile $Path
    if (Is-PidRunning $id) {
        Write-Host "Stopping $Name (pid $id)..."
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $Path) { Remove-Item $Path }
}

function Stop-Port {
    param ($Name, $Port, $Path)
    $id = Read-PidFile $Path
    if (!$id) { $id = Get-PidFromPort $Port }
    
    if (Is-PidRunning $id) {
        Write-Host "Stopping $Name (port $Port, pid $id)..."
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $Path) { Remove-Item $Path }
}

if ($Command -eq "up") {
    Start-Backend
    Start-Frontend "frontend-user" $UserPidFile $UserLog "dev:user" 5101
    Start-Frontend "frontend-tenant" $TenantPidFile $TenantLog "dev:tenant" 5102
    Start-Frontend "frontend-admin" $AdminPidFile $AdminLog "dev:admin" 5103
    
    Write-Host "`nServices started!"
    Write-Host "- Backend:  http://localhost:8101/health"
    Write-Host "- User:     http://localhost:5101/"
    Write-Host "- Tenant:   http://localhost:5102/"
    Write-Host "- Admin:    http://localhost:5103/"
    Write-Host "`nLogs are in $LogDir"
}
elseif ($Command -eq "down" -or $Command -eq "stop") {
    Stop-Port "frontend-admin" 5103 $AdminPidFile
    Stop-Port "frontend-tenant" 5102 $TenantPidFile
    Stop-Port "frontend-user" 5101 $UserPidFile
    Stop-Port "backend" 8101 $BackendPidFile
    Write-Host "Stopped."
}
elseif ($Command -eq "status") {
    Write-Host "Checking ports..."
    Get-NetTCPConnection -LocalPort 8101,5101,5102,5103 -State Listen -ErrorAction SilentlyContinue | Format-Table LocalPort,OwningProcess,State -AutoSize
}
else {
    Write-Host "Usage: .\dev.ps1 {up|down|status}"
}
