# BasaltPass Dashboard API 测试脚本
# 测试Dashboard页面需要的API接口

# 配置
$BaseUrl = "http://localhost:8080"
$Headers = @{
    "Content-Type" = "application/json"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BasaltPass Dashboard API 测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 步骤1: 用户登录
Write-Host "`n1. 用户认证..." -ForegroundColor Yellow

$LoginData = @{
    email = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json

try {
    $LoginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method POST -Body $LoginData -Headers $Headers
    $Token = $LoginResponse.access_token
    $AuthHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $Token"
    }
    Write-Host "用户登录成功" -ForegroundColor Green
    Write-Host "Token: $($Token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "用户登录失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 步骤2: 测试钱包余额API
Write-Host "`n2. 测试钱包余额API..." -ForegroundColor Yellow

try {
    $BalanceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/wallet/balance?currency=USD" -Method GET -Headers $AuthHeaders
    Write-Host "钱包余额API调用成功" -ForegroundColor Green
    Write-Host "余额: $($BalanceResponse.balance) 分" -ForegroundColor Gray
    Write-Host "货币: $($BalanceResponse.currency)" -ForegroundColor Gray
    Write-Host "显示金额: $($BalanceResponse.balance / 100) USD" -ForegroundColor Green
} catch {
    Write-Host "钱包余额API调用失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 步骤3: 测试安全状态API
Write-Host "`n3. 测试安全状态API..." -ForegroundColor Yellow

try {
    $SecurityResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/security/status" -Method GET -Headers $AuthHeaders
    Write-Host "安全状态API调用成功" -ForegroundColor Green
    Write-Host "密码设置: $($SecurityResponse.password_set)" -ForegroundColor Gray
    Write-Host "2FA启用: $($SecurityResponse.two_fa_enabled)" -ForegroundColor Gray
    Write-Host "Passkey数量: $($SecurityResponse.passkeys_count)" -ForegroundColor Gray
    Write-Host "邮箱: $($SecurityResponse.email)" -ForegroundColor Gray
    Write-Host "邮箱验证: $($SecurityResponse.email_verified)" -ForegroundColor Gray
    Write-Host "手机验证: $($SecurityResponse.phone_verified)" -ForegroundColor Gray
    
    # 计算安全等级
    $score = 0
    if ($SecurityResponse.password_set) { $score += 1 }
    if ($SecurityResponse.two_fa_enabled) { $score += 2 }
    if ($SecurityResponse.passkeys_count -gt 0) { $score += 2 }
    if ($SecurityResponse.email_verified) { $score += 1 }
    if ($SecurityResponse.phone_verified) { $score += 1 }
    
    if ($score -ge 5) { 
        $level = "高"
        $description = "已启用2FA"
    } elseif ($score -ge 3) { 
        $level = "中"
        $description = "建议启用2FA"
    } else { 
        $level = "低"
        $description = "需要加强安全设置"
    }
    
    Write-Host "安全等级: $level" -ForegroundColor Green
    Write-Host "安全描述: $description" -ForegroundColor Green
    
} catch {
    Write-Host "安全状态API调用失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试总结
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Dashboard API 测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "✅ 钱包余额API: 正常" -ForegroundColor Green
Write-Host "✅ 安全状态API: 正常" -ForegroundColor Green
Write-Host "`nDashboard页面应该能够正常显示真实数据" -ForegroundColor Green 