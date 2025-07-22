# 测试修复后的优惠券创建API
$baseUrl = "http://localhost:8080"

Write-Host "正在测试修复后的优惠券创建API..." -ForegroundColor Green

# 第一步：管理员登录获取JWT token
Write-Host "`n步骤1: 管理员登录..." -ForegroundColor Yellow

$loginData = @{
    email = "admin@basaltpass.com"  # 使用管理员账号
    password = "admin123"           # 管理员密码
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    $token = $loginResponse.data.access_token
    Write-Host "✅ 管理员登录成功，获取到token" -ForegroundColor Green
} catch {
    Write-Host "❌ 管理员登录失败：" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# 第二步：创建优惠券（使用原始的前端请求格式）
Write-Host "`n步骤2: 创建优惠券..." -ForegroundColor Yellow

$couponData = @{
    code = "SAVE20_FIXED"  # 使用不同的代码避免重复
    name = "修复后的测试优惠券"
    discount_type = "percentage"  # 注意：这里仍然使用percentage，后端会自动转换
    discount_value = 17
    max_redemptions = $null
    expires_at = "2025-08-02T00:00:00Z"
    is_active = $true
} | ConvertTo-Json

Write-Host "发送的数据：" -ForegroundColor Cyan
Write-Host $couponData

try {
    # 发送POST请求创建优惠券（使用正确的管理员路径）
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/coupons" -Method POST -Headers $headers -Body $couponData
    
    Write-Host "✅ 优惠券创建成功！" -ForegroundColor Green
    Write-Host "响应：" -ForegroundColor Blue
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "❌ 优惠券创建失败：" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # 如果有响应体，显示详细错误信息
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "错误详情：$errorBody" -ForegroundColor Red
        } catch {
            Write-Host "无法读取错误详情" -ForegroundColor Red
        }
    }
}

Write-Host "`n测试完成。" -ForegroundColor Green 