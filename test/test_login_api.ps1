# 测试登录API
Write-Host "测试登录API..." -ForegroundColor Green

# 测试数据
$loginData = @{
    identifier = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Write-Host "发送登录请求..." -ForegroundColor Yellow
Write-Host "请求数据: $loginData" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "登录成功!" -ForegroundColor Green
    Write-Host "响应: $($response | ConvertTo-Json -Depth 10)" -ForegroundColor Gray
} catch {
    Write-Host "登录失败!" -ForegroundColor Red
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应体: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n测试用户注册..." -ForegroundColor Green

$registerData = @{
    email = "test@example.com"
    phone = "13800138000"
    password = "password123"
} | ConvertTo-Json

Write-Host "发送注册请求..." -ForegroundColor Yellow
Write-Host "请求数据: $registerData" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "注册成功!" -ForegroundColor Green
    Write-Host "响应: $($response | ConvertTo-Json -Depth 10)" -ForegroundColor Gray
} catch {
    Write-Host "注册失败!" -ForegroundColor Red
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应体: $responseBody" -ForegroundColor Red
    }
} 