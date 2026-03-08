# 测试订阅API
Write-Host "=== 测试订阅API ===" -ForegroundColor Green

# 1. 测试获取订阅列表（不需要认证）
Write-Host "1. 测试获取订阅列表..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/subscriptions" -Method GET
    Write-Host "订阅列表获取成功!" -ForegroundColor Green
    Write-Host "响应结构:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "获取订阅列表失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "错误详情: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green 