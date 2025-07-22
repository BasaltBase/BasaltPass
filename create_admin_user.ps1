# 创建管理员用户
Write-Host "=== 创建管理员用户 ===" -ForegroundColor Green

# 1. 注册管理员用户
Write-Host "1. 注册管理员用户..." -ForegroundColor Yellow
try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method POST -ContentType "application/json" -Body '{
        "email": "admin@example.com",
        "password": "admin123"
    }'
    Write-Host "管理员用户注册成功! ID: $($registerResponse.id)" -ForegroundColor Green
} catch {
    Write-Host "注册失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "错误详情: $errorBody" -ForegroundColor Red
    }
}

# 2. 登录获取token
Write-Host "`n2. 管理员登录..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{
        "identifier": "admin@example.com",
        "password": "admin123"
    }'
    
    $token = $loginResponse.access_token
    Write-Host "登录成功，Token: $($token.Substring(0, 20))..." -ForegroundColor Green
    
    # 3. 分配管理员角色
    Write-Host "`n3. 分配管理员角色..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $roleResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/user/1/role" -Method POST -Headers $headers -Body '{
        "role": "admin"
    }'
    Write-Host "管理员角色分配成功!" -ForegroundColor Green
    
} catch {
    Write-Host "登录或角色分配失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 完成 ===" -ForegroundColor Green 