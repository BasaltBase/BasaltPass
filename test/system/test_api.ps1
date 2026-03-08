# BasaltPass API 测试脚本
Write-Host "=== BasaltPass API 测试 ===" -ForegroundColor Green

# 测试健康检查
Write-Host "`n1. 测试健康检查..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET
    Write-Host "✓ 健康检查通过: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ 健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 测试用户注册
Write-Host "`n2. 测试用户注册..." -ForegroundColor Yellow
$registerData = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $register = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/auth/register" -Method POST -ContentType "application/json" -Body $registerData
    Write-Host "✓ 用户注册成功: $($register.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ 用户注册失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试用户登录
Write-Host "`n3. 测试用户登录..." -ForegroundColor Yellow
$loginData = @{
    identifier = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $login = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    $loginResponse = $login.Content | ConvertFrom-Json
    Write-Host "✓ 用户登录成功" -ForegroundColor Green
    Write-Host "  访问令牌: $($loginResponse.access_token.Substring(0, 20))..." -ForegroundColor Gray
    
    # 保存令牌用于后续测试
    $accessToken = $loginResponse.access_token
} catch {
    Write-Host "✗ 用户登录失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试获取用户资料（需要认证）
if ($accessToken) {
    Write-Host "`n4. 测试获取用户资料..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $accessToken"
    }
    
    try {
        $profile = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/user/profile" -Method GET -Headers $headers
        Write-Host "✓ 获取用户资料成功: $($profile.Content)" -ForegroundColor Green
    } catch {
        Write-Host "✗ 获取用户资料失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green 