# 直接测试优惠券创建API（不依赖登录）
$baseUrl = "http://localhost:8080/api/v1"

# 测试创建优惠券
Write-Host "正在测试创建优惠券..." -ForegroundColor Yellow
$couponData = @{
    code = "SAVE50"
    name = "CE"
    discount_type = "percentage"
    discount_value = 10
    max_redemptions = 1
    expires_at = "2025-07-31"
    is_active = $true
} | ConvertTo-Json

Write-Host "发送数据: $couponData" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/coupons" -Method POST -ContentType "application/json" -Body $couponData
    Write-Host "优惠券创建成功!" -ForegroundColor Green
    Write-Host "响应: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
} catch {
    Write-Host "优惠券创建失败!" -ForegroundColor Red
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应体: $responseBody" -ForegroundColor Red
        Write-Host "状态码: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
} 