# 完整的2FA验证测试脚本
Write-Host "开始2FA验证测试..." -ForegroundColor Green

# 第一步：登录
$loginData = @{
    identifier = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Write-Host "`n1. 发送登录请求..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "登录响应: $($loginResponse | ConvertTo-Json -Depth 10)" -ForegroundColor Green
} catch {
    Write-Host "登录失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($loginResponse.need_2fa) {
    Write-Host "`n2. 需要2FA验证..." -ForegroundColor Yellow
    Write-Host "用户ID: $($loginResponse.user_id)" -ForegroundColor Cyan
    Write-Host "2FA类型: $($loginResponse.'2fa_type')" -ForegroundColor Cyan
    
    # 第二步：发送2FA验证码
    $verifyData = @{
        user_id = $loginResponse.user_id
        code = "123456"  # 测试用的验证码
        method = $loginResponse.'2fa_type'
    } | ConvertTo-Json
    
    Write-Host "`n3. 发送2FA验证请求..." -ForegroundColor Yellow
    Write-Host "验证数据: $verifyData" -ForegroundColor Gray
    
    try {
        $verifyResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/verify-2fa" -Method POST -Body $verifyData -ContentType "application/json"
        Write-Host "2FA验证成功!" -ForegroundColor Green
        Write-Host "响应: $($verifyResponse | ConvertTo-Json -Depth 10)" -ForegroundColor Gray
        
        # 保存token用于后续测试
        if ($verifyResponse.data.token) {
            $token = $verifyResponse.data.token
            Write-Host "`n4. 使用token测试用户信息..." -ForegroundColor Yellow
            
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            
            try {
                $profileResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/user/profile" -Method GET -Headers $headers
                Write-Host "用户信息获取成功!" -ForegroundColor Green
                Write-Host "用户信息: $($profileResponse | ConvertTo-Json -Depth 10)" -ForegroundColor Gray
                
                # 测试邀请API
                Write-Host "`n5. 测试邀请API..." -ForegroundColor Yellow
                try {
                    $invitationsResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/invitations" -Method GET -Headers $headers
                    Write-Host "邀请API测试成功!" -ForegroundColor Green
                    Write-Host "邀请列表: $($invitationsResponse | ConvertTo-Json -Depth 10)" -ForegroundColor Gray
                } catch {
                    Write-Host "邀请API测试失败: $($_.Exception.Message)" -ForegroundColor Red
                }
                
            } catch {
                Write-Host "用户信息获取失败: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
    } catch {
        Write-Host "2FA验证失败: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "响应体: $responseBody" -ForegroundColor Red
        }
    }
} else {
    Write-Host "不需要2FA验证" -ForegroundColor Yellow
}

Write-Host "`n测试完成!" -ForegroundColor Green 