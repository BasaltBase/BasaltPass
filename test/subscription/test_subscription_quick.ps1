# BasaltPass 订阅系统快速测试脚本

$BaseUrl = "http://localhost:8080"
$Headers = @{
    "Content-Type" = "application/json"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BasaltPass 订阅系统快速测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 步骤1: 用户登录
Write-Host "`n1. 用户登录..." -ForegroundColor Yellow

$LoginData = @{
    email = "subscription-test@example.com"
    password = "Test123456"
} | ConvertTo-Json

try {
    $LoginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method POST -Body $LoginData -Headers $Headers
    $Token = $LoginResponse.access_token
    $AuthHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $Token"
    }
    Write-Host "✅ 用户登录成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 用户登录失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请先运行完整测试脚本创建用户" -ForegroundColor Yellow
    exit 1
}

# 步骤2: 测试产品目录API
Write-Host "`n2. 测试产品目录..." -ForegroundColor Yellow

try {
    $ProductsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/products" -Method GET -Headers $Headers
    Write-Host "✅ 产品目录API正常" -ForegroundColor Green
    
    if ($ProductsResponse.data -and $ProductsResponse.data.Count -gt 0) {
        Write-Host "找到 $($ProductsResponse.data.Count) 个产品" -ForegroundColor Gray
        $SelectedPrice = $null
        foreach ($product in $ProductsResponse.data) {
            foreach ($plan in $product.plans) {
                if ($plan.prices -and $plan.prices.Count -gt 0) {
                    $SelectedPrice = $plan.prices[0]
                    break
                }
            }
            if ($SelectedPrice) { break }
        }
    } else {
        Write-Host "⚠️ 没有找到产品数据" -ForegroundColor Yellow
        $SelectedPrice = $null
    }
} catch {
    Write-Host "❌ 产品目录API失败: $($_.Exception.Message)" -ForegroundColor Red
    $SelectedPrice = $null
}

# 步骤3: 测试订阅结账API（如果有价格）
if ($SelectedPrice) {
    Write-Host "`n3. 测试快速结账..." -ForegroundColor Yellow
    
    $CheckoutData = @{
        price_id = $SelectedPrice.id
        quantity = 1
    } | ConvertTo-Json
    
    try {
        $CheckoutResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/subscriptions/quick-checkout" -Method POST -Body $CheckoutData -Headers $AuthHeaders
        Write-Host "✅ 快速结账API正常" -ForegroundColor Green
        Write-Host "订阅ID: $($CheckoutResponse.data.subscription.id)" -ForegroundColor Gray
        Write-Host "订阅状态: $($CheckoutResponse.data.subscription.status)" -ForegroundColor Gray
        
        $SessionId = $CheckoutResponse.data.payment_session?.stripe_session_id
        
    } catch {
        Write-Host "❌ 快速结账API失败: $($_.Exception.Message)" -ForegroundColor Red
        $SessionId = $null
    }
} else {
    Write-Host "`n3. 跳过结账测试（无价格数据）" -ForegroundColor Yellow
    $SessionId = $null
}

# 步骤4: 测试支付模拟（如果有会话）
if ($SessionId) {
    Write-Host "`n4. 测试支付模拟..." -ForegroundColor Yellow
    
    $SimulateData = @{
        success = $true
    } | ConvertTo-Json
    
    try {
        $SimulateResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/payment/simulate/$SessionId" -Method POST -Body $SimulateData -Headers $AuthHeaders
        Write-Host "✅ 支付模拟API正常" -ForegroundColor Green
        Write-Host "模拟结果: $($SimulateResponse.message)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ 支付模拟API失败: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "`n4. 跳过支付模拟测试" -ForegroundColor Yellow
}

# 步骤5: 测试订阅列表API
Write-Host "`n5. 测试订阅列表..." -ForegroundColor Yellow

try {
    $SubscriptionsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/subscriptions" -Method GET -Headers $AuthHeaders
    Write-Host "✅ 订阅列表API正常" -ForegroundColor Green
    
    if ($SubscriptionsResponse.data -and $SubscriptionsResponse.data.Count -gt 0) {
        Write-Host "找到 $($SubscriptionsResponse.data.Count) 个订阅" -ForegroundColor Gray
        foreach ($sub in $SubscriptionsResponse.data[0..2]) {
            Write-Host "  - ID: $($sub.id), 状态: $($sub.status)" -ForegroundColor Gray
        }
    } else {
        Write-Host "没有找到订阅数据" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ 订阅列表API失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试总结
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "快速测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "🎉 基本API测试完成！" -ForegroundColor Magenta
Write-Host "💡 如需完整测试，请运行: ./test_subscription_checkout.ps1" -ForegroundColor Blue
Write-Host "💡 前端访问地址: http://localhost:3000/subscriptions/checkout" -ForegroundColor Blue 