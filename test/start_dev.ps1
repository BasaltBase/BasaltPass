# BasaltPass 快速启动脚本
# 同时启动后端和前端开发服务器

Write-Host "============================================" -ForegroundColor Green
Write-Host "BasaltPass 开发环境启动" -ForegroundColor Green  
Write-Host "============================================" -ForegroundColor Green

# 编译后端
Write-Host "`n[1] 编译后端..." -ForegroundColor Yellow
Set-Location "basaltpass-backend"
go build -o main.exe ./cmd/basaltpass
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 后端编译失败" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ 后端编译成功" -ForegroundColor Green

# 启动后端
Write-Host "`n[2] 启动后端服务器..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "./main.exe" -PassThru
Write-Host "✅ 后端服务器已启动 (PID: $($backendProcess.Id))" -ForegroundColor Green
Write-Host "   - API地址: http://localhost:8080" -ForegroundColor Cyan
Write-Host "   - 健康检查: http://localhost:8080/health" -ForegroundColor Cyan

# 启动前端
Write-Host "`n[3] 启动前端开发服务器..." -ForegroundColor Yellow
Set-Location "../basaltpass-frontend"
Write-Host "✅ 正在启动前端..." -ForegroundColor Green
Write-Host "   - 前端地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   - 按 Ctrl+C 停止所有服务" -ForegroundColor Cyan

# 启动前端（前台运行）
try {
    npm run dev
} finally {
    # 清理后端进程
    Write-Host "`n正在停止后端服务器..." -ForegroundColor Yellow
    if ($backendProcess -and !$backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
        Write-Host "✅ 后端服务器已停止" -ForegroundColor Green
    }
    Set-Location ..
}
