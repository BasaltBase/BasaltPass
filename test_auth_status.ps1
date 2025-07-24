# 测试认证状态的脚本
Write-Host "测试认证状态..." -ForegroundColor Green

# 测试后端健康状态
Write-Host "`n1. 测试后端健康状态..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
    Write-Host "后端健康状态: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "后端连接失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试用户认证API
Write-Host "`n2. 测试用户认证API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/user/profile" -Method GET -TimeoutSec 5
    Write-Host "用户认证API响应: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "用户认证API失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试邀请API
Write-Host "`n3. 测试邀请API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/invitations" -Method GET -TimeoutSec 5
    Write-Host "邀请API响应: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "邀请API失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n测试完成!" -ForegroundColor Green 