# 测试优惠券创建API
$baseUrl = "http://localhost:8080/api/v1"

# 先注册一个新用户
Write-Host "正在注册新用户..." -ForegroundColor Yellow
try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body '{
        "email": "coupon@example.com",
        "password": "password123"
    }'
    Write-Host "注册成功: $($registerResponse | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "注册失败或用户已存在: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 登录获取token
Write-Host "`n正在登录..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body '{
    "identifier": "coupon@example.com",
    "password": "password123"
}'

Write-Host "登录响应: $($loginResponse | ConvertTo-Json)" -ForegroundColor Cyan

# 检查是否需要2FA
if ($loginResponse.need_2fa) {
    Write-Host "需要2FA验证，跳过测试..." -ForegroundColor Yellow
    exit
}

$token = $loginResponse.access_token
Write-Host "登录成功，获取到token: $token" -ForegroundColor Green

# 设置请求头
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 测试创建优惠券
Write-Host "`n正在测试创建优惠券..." -ForegroundColor Yellow
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
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/coupons" -Method POST -Headers $headers -Body $couponData
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

# 测试获取优惠券列表
Write-Host "`n正在测试获取优惠券列表..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/coupons" -Method GET -Headers $headers
    Write-Host "获取优惠券列表成功!" -ForegroundColor Green
    Write-Host "响应: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
} catch {
    Write-Host "获取优惠券列表失败!" -ForegroundColor Red
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应体: $responseBody" -ForegroundColor Red
    }
} 