# BasaltPass 订阅系统 API 测试脚本
# 测试订阅功能的基本流程

$baseUrl = "http://localhost:8080/api/v1"

# 颜色输出函数
function Write-ColoredOutput {
    param([string]$message, [string]$color)
    switch ($color) {
        "green" { Write-Host $message -ForegroundColor Green }
        "red" { Write-Host $message -ForegroundColor Red }
        "yellow" { Write-Host $message -ForegroundColor Yellow }
        "blue" { Write-Host $message -ForegroundColor Blue }
        default { Write-Host $message }
    }
}

function Test-API {
    param([string]$method, [string]$url, [object]$body, [hashtable]$headers, [string]$description)
    
    Write-ColoredOutput "测试: $description" "blue"
    Write-ColoredOutput "请求: $method $url" "yellow"
    
    try {
        $params = @{
            Uri = $url
            Method = $method
            ContentType = "application/json"
        }
        
        if ($headers) {
            $params.Headers = $headers
        }
        
        if ($body) {
            $params.Body = ($body | ConvertTo-Json -Depth 10)
            Write-ColoredOutput "请求体: $($params.Body)" "yellow"
        }
        
        $response = Invoke-RestMethod @params
        Write-ColoredOutput "✓ 成功: $($response | ConvertTo-Json -Depth 3)" "green"
        return $response
    }
    catch {
        Write-ColoredOutput "✗ 失败: $($_.Exception.Message)" "red"
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseText = $reader.ReadToEnd()
            Write-ColoredOutput "错误详情: $responseText" "red"
        }
        return $null
    }
}

Write-ColoredOutput "开始测试 BasaltPass 订阅系统 API..." "blue"

# 1. 用户注册和登录
Write-ColoredOutput "`n======== 步骤 1: 用户认证 ========" "blue"

$registerData = @{
    email = "test-subscription@example.com"
    password = "password123"
    nickname = "订阅测试用户"
}

$registerResponse = Test-API "POST" "$baseUrl/auth/register" $registerData @{} "用户注册"

if (-not $registerResponse) {
    Write-ColoredOutput "用户注册失败，尝试登录..." "yellow"
}

$loginData = @{
    email = "test-subscription@example.com"
    password = "password123"
}

$loginResponse = Test-API "POST" "$baseUrl/auth/login" $loginData @{} "用户登录"

if (-not $loginResponse) {
    Write-ColoredOutput "无法登录，测试终止" "red"
    exit 1
}

$token = $loginResponse.access_token
$authHeaders = @{
    "Authorization" = "Bearer $token"
}

Write-ColoredOutput "登录成功，获得 token: $($token.Substring(0, 20))..." "green"

# 2. 创建产品（需要管理员权限，可能会失败）
Write-ColoredOutput "`n======== 步骤 2: 产品管理 ========" "blue"

$productData = @{
    code = "test-product-$(Get-Date -Format 'yyyyMMddHHmmss')"
    name = "测试产品"
    description = "这是一个测试产品"
    metadata = @{
        category = "test"
        features = @("feature1", "feature2")
    }
}

$productResponse = Test-API "POST" "$baseUrl/admin/products" $productData $authHeaders "创建产品（管理员）"

# 如果创建失败，尝试获取现有产品列表
if (-not $productResponse) {
    Write-ColoredOutput "创建产品失败（可能需要管理员权限），尝试获取产品列表..." "yellow"
    $productsResponse = Test-API "GET" "$baseUrl/products" $null @{} "获取产品列表"
}

# 3. 获取产品列表
Write-ColoredOutput "`n======== 步骤 3: 查看产品 ========" "blue"

$productsResponse = Test-API "GET" "$baseUrl/products" $null @{} "获取产品列表"

if ($productsResponse -and $productsResponse.data -and $productsResponse.data.Data -and $productsResponse.data.Data.Count -gt 0) {
    $firstProduct = $productsResponse.data.Data[0]
    Write-ColoredOutput "找到产品: $($firstProduct.name) (ID: $($firstProduct.id))" "green"
    
    # 获取产品详情
    $productDetailResponse = Test-API "GET" "$baseUrl/products/$($firstProduct.id)" $null @{} "获取产品详情"
} else {
    Write-ColoredOutput "没有找到产品，跳过后续测试" "yellow"
}

# 4. 套餐管理
Write-ColoredOutput "`n======== 步骤 4: 套餐管理 ========" "blue"

if ($productResponse -and $productResponse.data) {
    $planData = @{
        product_id = $productResponse.data.id
        code = "basic-plan"
        display_name = "基础套餐"
        plan_version = 1
        metadata = @{
            type = "basic"
        }
    }
    
    $planResponse = Test-API "POST" "$baseUrl/admin/plans" $planData $authHeaders "创建套餐（管理员）"
}

# 获取套餐列表
$plansResponse = Test-API "GET" "$baseUrl/plans" $null @{} "获取套餐列表"

# 5. 定价管理
Write-ColoredOutput "`n======== 步骤 5: 定价管理 ========" "blue"

if ($planResponse -and $planResponse.data) {
    $priceData = @{
        plan_id = $planResponse.data.id
        currency = "CNY"
        amount_cents = 9900  # 99.00 元
        billing_period = "month"
        billing_interval = 1
        usage_type = "license"
        trial_days = 7
        metadata = @{
            display_name = "月度订阅"
        }
    }
    
    $priceResponse = Test-API "POST" "$baseUrl/admin/prices" $priceData $authHeaders "创建定价（管理员）"
}

# 6. 优惠券管理
Write-ColoredOutput "`n======== 步骤 6: 优惠券管理 ========" "blue"

$couponData = @{
    code = "WELCOME50"
    discount_type = "percent"
    value = 50.0
    duration = "once"
    max_redemptions = 100
    expires_at = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
    metadata = @{
        description = "欢迎优惠券"
    }
}

$couponResponse = Test-API "POST" "$baseUrl/admin/coupons" $couponData $authHeaders "创建优惠券（管理员）"

# 验证优惠券
if ($couponResponse -and $couponResponse.data) {
    $validateCouponResponse = Test-API "GET" "$baseUrl/coupons/$($couponResponse.data.code)/validate" $null @{} "验证优惠券"
}

# 7. 订阅管理
Write-ColoredOutput "`n======== 步骤 7: 订阅管理 ========" "blue"

if ($priceResponse -and $priceResponse.data) {
    $subscriptionData = @{
        price_id = $priceResponse.data.id
        coupon_code = if ($couponResponse -and $couponResponse.data) { $couponResponse.data.code } else { $null }
        metadata = @{
            source = "api_test"
        }
    }
    
    $subscriptionResponse = Test-API "POST" "$baseUrl/subscriptions" $subscriptionData $authHeaders "创建订阅"
    
    if ($subscriptionResponse -and $subscriptionResponse.data) {
        $subscriptionId = $subscriptionResponse.data.id
        Write-ColoredOutput "订阅创建成功，ID: $subscriptionId" "green"
        
        # 获取订阅详情
        $subscriptionDetailResponse = Test-API "GET" "$baseUrl/subscriptions/$subscriptionId" $null $authHeaders "获取订阅详情"
        
        # 获取用户订阅列表
        $userSubscriptionsResponse = Test-API "GET" "$baseUrl/subscriptions" $null $authHeaders "获取用户订阅列表"
        
        # 取消订阅
        $cancelData = @{
            reason = "测试取消"
        }
        
        Write-ColoredOutput "等待3秒后取消订阅..." "yellow"
        Start-Sleep -Seconds 3
        
        $cancelResponse = Test-API "PUT" "$baseUrl/subscriptions/$subscriptionId/cancel" $cancelData $authHeaders "取消订阅"
    }
}

# 8. 使用记录
Write-ColoredOutput "`n======== 步骤 8: 使用记录 ========" "blue"

if ($subscriptionResponse -and $subscriptionResponse.data -and $subscriptionResponse.data.items -and $subscriptionResponse.data.items.Count -gt 0) {
    $subscriptionItemId = $subscriptionResponse.data.items[0].id
    
    $usageData = @{
        subscription_item_id = $subscriptionItemId
        quantity = 10.5
        source = "api_test"
        idempotency_key = "test-usage-$(Get-Date -Format 'yyyyMMddHHmmss')"
    }
    
    $usageResponse = Test-API "POST" "$baseUrl/usage/records" $usageData $authHeaders "创建使用记录"
}

Write-ColoredOutput "`n======== 测试完成 ========" "blue"
Write-ColoredOutput "订阅系统基础功能测试已完成。" "green"
Write-ColoredOutput "注意：某些管理员功能可能需要相应的权限才能成功执行。" "yellow" 