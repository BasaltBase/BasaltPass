# 测试管理员订阅API
Write-Host "=== 测试管理员订阅API ===" -ForegroundColor Green

# 1. 管理员登录获取token
Write-Host "1. 管理员登录..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{
    "identifier": "test@example.com",
    "password": "password123"
}'

$token = $loginResponse.access_token
Write-Host "登录成功，Token: $($token.Substring(0, 20))..." -ForegroundColor Green

# 2. 获取管理员订阅列表
Write-Host "`n2. 获取管理员订阅列表..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $subscriptionsResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/subscriptions" -Method GET -Headers $headers
    Write-Host "订阅列表获取成功!" -ForegroundColor Green
    Write-Host "响应数据结构:" -ForegroundColor Cyan
    $subscriptionsResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "获取订阅列表失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "错误详情: $errorBody" -ForegroundColor Red
    }
}

# 3. 获取单个订阅详情
Write-Host "`n3. 获取订阅详情..." -ForegroundColor Yellow
try {
    $subscriptionDetailResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/subscriptions/1" -Method GET -Headers $headers
    Write-Host "订阅详情获取成功!" -ForegroundColor Green
    Write-Host "订阅详情:" -ForegroundColor Cyan
    $subscriptionDetailResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "获取订阅详情失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green 