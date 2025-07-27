# 创建测试用户脚本
Write-Host "创建测试用户..." -ForegroundColor Green

# 首先尝试注册一个用户
$registerData = @{
    email = "simple@test.com"
    phone = "13900139000"
    password = "password123"
} | ConvertTo-Json

Write-Host "注册用户..." -ForegroundColor Yellow
Write-Host "请求数据: $registerData" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "注册成功! 用户ID: $($response.id)" -ForegroundColor Green
} catch {
    Write-Host "注册失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应体: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n测试登录..." -ForegroundColor Green

$loginData = @{
    identifier = "simple@test.com"
    password = "password123"
} | ConvertTo-Json

Write-Host "登录请求数据: $loginData" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "登录成功!" -ForegroundColor Green
    Write-Host "响应: $($response | ConvertTo-Json -Depth 10)" -ForegroundColor Gray
    
    if ($response.need_2fa) {
        Write-Host "需要2FA验证，类型: $($response.'2fa_type')" -ForegroundColor Yellow
        Write-Host "可用方法: $($response.available_2fa_methods -join ', ')" -ForegroundColor Yellow
    } else {
        Write-Host "不需要2FA验证，直接登录成功!" -ForegroundColor Green
    }
} catch {
    Write-Host "登录失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应体: $responseBody" -ForegroundColor Red
    }
} 