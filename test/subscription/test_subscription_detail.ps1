# 测试订阅详情API
Write-Host "=== 测试订阅详情API ===" -ForegroundColor Green

# 1. 先尝试获取订阅列表
Write-Host "1. 获取订阅列表..." -ForegroundColor Yellow
try {
    $subscriptionsResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/subscriptions" -Method GET
    Write-Host "订阅列表获取成功!" -ForegroundColor Green
    Write-Host "订阅数量: $($subscriptionsResponse.data.data.Count)" -ForegroundColor Cyan
    
    if ($subscriptionsResponse.data.data.Count -gt 0) {
        $firstSubscription = $subscriptionsResponse.data.data[0]
        Write-Host "第一个订阅ID: $($firstSubscription.ID)" -ForegroundColor Cyan
        
        # 2. 获取订阅详情
        Write-Host "`n2. 获取订阅详情..." -ForegroundColor Yellow
        $detailResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/subscriptions/$($firstSubscription.ID)" -Method GET
        Write-Host "订阅详情获取成功!" -ForegroundColor Green
        Write-Host "详情数据:" -ForegroundColor Cyan
        $detailResponse | ConvertTo-Json -Depth 10
    } else {
        Write-Host "没有找到订阅数据" -ForegroundColor Yellow
    }
} catch {
    Write-Host "API调用失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "错误详情: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green 