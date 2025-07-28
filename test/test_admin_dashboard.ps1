# BasaltPass Admin Dashboard API 测试脚本

$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== BasaltPass Admin Dashboard API 测试 ===" -ForegroundColor Green

# 1. 创建测试用户并登录获取token
Write-Host "`n1. 创建测试用户..." -ForegroundColor Yellow
$registerData = @{
    email = "admin@test.com"
    password = "Test123456!"
    nickname = "Admin User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method POST -Body $registerData -Headers $headers
    Write-Host "用户创建成功" -ForegroundColor Green
} catch {
    Write-Host "用户可能已存在，继续登录..." -ForegroundColor Yellow
}

# 2. 登录获取JWT token
Write-Host "`n2. 登录获取管理员token..." -ForegroundColor Yellow
$loginData = @{
    email = "admin@test.com"
    password = "Test123456!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -Body $loginData -Headers $headers
    $token = $loginResponse.token
    Write-Host "登录成功，获取到token" -ForegroundColor Green
    
    # 更新headers包含认证token
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }
    
    # 3. 测试仪表板统计API
    Write-Host "`n3. 获取仪表板统计数据..." -ForegroundColor Yellow
    try {
        $statsResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/dashboard/stats" -Method GET -Headers $authHeaders
        Write-Host "仪表板统计API响应:" -ForegroundColor Green
        $statsResponse | ConvertTo-Json -Depth 3 | Write-Host
    } catch {
        Write-Host "仪表板统计API调用失败: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "响应详情: $($_.Exception.Response)" -ForegroundColor Red
    }
    
    # 4. 测试最近活动API
    Write-Host "`n4. 获取最近活动数据..." -ForegroundColor Yellow
    try {
        $activitiesResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/dashboard/activities" -Method GET -Headers $authHeaders
        Write-Host "最近活动API响应:" -ForegroundColor Green
        $activitiesResponse | ConvertTo-Json -Depth 3 | Write-Host
    } catch {
        Write-Host "最近活动API调用失败: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "响应详情: $($_.Exception.Response)" -ForegroundColor Red
    }
    
    # 5. 测试用户列表API（确保管理员权限正常）
    Write-Host "`n5. 测试用户列表API..." -ForegroundColor Yellow
    try {
        $usersResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users" -Method GET -Headers $authHeaders
        Write-Host "用户列表API响应 (显示前3个):" -ForegroundColor Green
        $usersResponse | Select-Object -First 3 | ConvertTo-Json -Depth 2 | Write-Host
    } catch {
        Write-Host "用户列表API调用失败: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "这可能是因为用户没有管理员权限" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "登录失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green
Write-Host "注意: 如果管理员权限相关的API调用失败，请确保:" -ForegroundColor Yellow
Write-Host "1. 用户具有管理员角色权限" -ForegroundColor Yellow
Write-Host "2. 后端服务正常运行" -ForegroundColor Yellow
Write-Host "3. 数据库连接正常" -ForegroundColor Yellow
