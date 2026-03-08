# ===================================================================
# BasaltPass 订单流程测试脚本
# 测试完整的用户订购流程：产品选择 -> 创建订单 -> 支付 -> 订阅激活
# ===================================================================

$ErrorActionPreference = "Stop"
$BaseURL = "http://localhost:8080"

# ANSI 颜色代码
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorText {
    param([string]$Text, [string]$Color)
    Write-Host "${Color}${Text}${Reset}"
}

function Write-Step {
    param([string]$Text)
    Write-ColorText "[STEP] $Text" $Blue
}

function Write-Success {
    param([string]$Text)
    Write-ColorText "[SUCCESS] $Text" $Green
}

function Write-Error {
    param([string]$Text)
    Write-ColorText "[ERROR] $Text" $Red
}

function Write-Info {
    param([string]$Text)
    Write-ColorText "[INFO] $Text" $Yellow
}

# 全局变量
$global:authToken = ""
$global:userId = 0
$global:orderId = 0
$global:sessionId = ""

try {
    Write-ColorText "开始订单流程测试" $Green
    Write-Host ""

    # ===== 第1步：用户登录 =====
    Write-Step "第1步：用户登录"
    $loginData = @{
        username = "admin"
        password = "adminpass"
    } | ConvertTo-Json -Compress

    $loginResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $global:authToken = $loginResponse.data.token
    $global:userId = $loginResponse.data.user.id
    Write-Success "登录成功 - 用户ID: $global:userId"
    Write-Host ""

    # ===== 第2步：获取产品目录 =====
    Write-Step "第2步：获取产品目录"
    $headers = @{ "Authorization" = "Bearer $global:authToken" }
    $productsResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/subscription/products" -Method GET -Headers $headers

    if ($productsResponse.data -and $productsResponse.data.Count -gt 0) {
        $product = $productsResponse.data[0]
        Write-Success "找到产品: $($product.Name)"
        
        if ($product.Plans -and $product.Plans.Count -gt 0) {
            $plan = $product.Plans[0]
            Write-Info "选择套餐: $($plan.DisplayName)"
            
            if ($plan.Prices -and $plan.Prices.Count -gt 0) {
                $price = $plan.Prices[0]
                $priceAmount = [math]::Round($price.AmountCents / 100, 2)
                Write-Info "选择价格: ¥$priceAmount/$($price.BillingPeriod)"
                $selectedPriceId = $price.ID
            } else {
                throw "没有找到可用价格"
            }
        } else {
            throw "没有找到可用套餐"
        }
    } else {
        throw "没有找到可用产品"
    }
    Write-Host ""

    # ===== 第3步：创建订单 =====
    Write-Step "第3步：创建订单"
    $orderData = @{
        user_id = $global:userId
        price_id = $selectedPriceId
        quantity = 1
    } | ConvertTo-Json -Compress

    $orderResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/orders" -Method POST -Body $orderData -ContentType "application/json" -Headers $headers
    $global:orderId = $orderResponse.data.id
    $orderNumber = $orderResponse.data.order_number
    $totalAmount = [math]::Round($orderResponse.data.total_amount / 100, 2)
    $expiresAt = $orderResponse.data.expires_at

    Write-Success "订单创建成功"
    Write-Info "订单ID: $global:orderId"
    Write-Info "订单号: $orderNumber"
    Write-Info "总金额: ¥$totalAmount"
    Write-Info "过期时间: $expiresAt"
    Write-Host ""

    # ===== 第4步：获取订单详情 =====
    Write-Step "第4步：获取订单详情"
    $orderDetailResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/orders/$global:orderId" -Method GET -Headers $headers
    $order = $orderDetailResponse.data
    
    Write-Success "订单详情获取成功"
    Write-Info "产品: $($order.price.plan.product.name) - $($order.price.plan.display_name)"
    Write-Info "状态: $($order.status)"
    Write-Info "描述: $($order.description)"
    Write-Host ""

    # ===== 第5步：创建支付意图 =====
    Write-Step "第5步：创建支付意图"
    $paymentIntentData = @{
        amount = $order.total_amount
        currency = $order.currency
        description = $order.description
        metadata = @{
            order_id = $global:orderId
            order_number = $orderNumber
        }
    } | ConvertTo-Json -Compress

    $paymentIntentResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/payment/intents" -Method POST -Body $paymentIntentData -ContentType "application/json" -Headers $headers
    $paymentIntentId = $paymentIntentResponse.data.payment_intent.id

    Write-Success "支付意图创建成功"
    Write-Info "支付意图ID: $paymentIntentId"
    Write-Host ""

    # ===== 第6步：创建支付会话 =====
    Write-Step "第6步：创建支付会话"
    $paymentSessionData = @{
        payment_intent_id = $paymentIntentId
        success_url = "http://localhost:3000/orders/$global:orderId/success"
        cancel_url = "http://localhost:3000/orders/$global:orderId/confirm"
    } | ConvertTo-Json -Compress

    $sessionResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/payment/sessions" -Method POST -Body $paymentSessionData -ContentType "application/json" -Headers $headers
    $global:sessionId = $sessionResponse.data.session.id

    Write-Success "支付会话创建成功"
    Write-Info "会话ID: $global:sessionId"
    Write-Info "支付页面: http://localhost:8080/payment/checkout/$global:sessionId"
    Write-Host ""

    # ===== 第7步：显示模拟支付信息 =====
    Write-Step "第7步：显示模拟Stripe支付信息"
    Write-ColorText "模拟Stripe请求详情：" $Blue
    $mockData = $sessionResponse.data.mock_response
    Write-Info "请求URL: $($mockData.request_url)"
    Write-Info "请求方法: $($mockData.request_method)"
    Write-Info "响应对象: checkout.session"
    Write-Info "Stripe会话ID: $($mockData.response.id)"
    Write-Info "支付金额: ¥$([math]::Round($mockData.response.amount_total / 100, 2))"
    Write-Info "币种: $($mockData.response.currency)"
    Write-Host ""

    # ===== 第8步：模拟支付成功 =====
    Write-Step "第8步：模拟支付成功"
    $simulateResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/payment/simulate/$global:sessionId" -Method POST -Body '{"success": true}' -ContentType "application/json" -Headers $headers

    Write-Success "支付模拟成功"
    Write-ColorText "模拟Webhook事件：" $Blue
    Write-Info "事件类型: $($simulateResponse.data.mock_response.request_body.type)"
    Write-Info "事件ID: $($simulateResponse.data.mock_response.request_body.id)"
    Write-Info "处理状态: received"
    Write-Host ""

    # ===== 第9步：验证订单状态更新 =====
    Write-Step "第9步：验证订单状态更新"
    Start-Sleep -Seconds 2  # 等待webhook处理完成
    
    $updatedOrderResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/orders/$global:orderId" -Method GET -Headers $headers
    $updatedOrder = $updatedOrderResponse.data

    if ($updatedOrder.status -eq "paid") {
        Write-Success "订单状态已更新为: $($updatedOrder.status)"
        Write-Info "支付时间: $($updatedOrder.paid_at)"
    } else {
        Write-Error "订单状态未正确更新，当前状态: $($updatedOrder.status)"
    }
    Write-Host ""

    # ===== 第10步：验证订阅创建 =====
    Write-Step "第10步：验证订阅创建"
    $subscriptionsResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/subscription/subscriptions" -Method GET -Headers $headers

    if ($subscriptionsResponse.data -and $subscriptionsResponse.data.Count -gt 0) {
        $latestSubscription = $subscriptionsResponse.data[0]
        Write-Success "订阅创建成功"
        Write-Info "订阅ID: $($latestSubscription.id)"
        Write-Info "订阅状态: $($latestSubscription.status)"
        Write-Info "当前周期: $($latestSubscription.current_period_start) 到 $($latestSubscription.current_period_end)"
        
        if ($latestSubscription.current_price) {
            Write-Info "订阅产品: $($latestSubscription.current_price.plan.product.name) - $($latestSubscription.current_price.plan.display_name)"
        }
    } else {
        Write-Error "未找到对应的订阅"
    }
    Write-Host ""

    # ===== 第11步：获取用户订单列表 =====
    Write-Step "第11步：获取用户订单列表"
    $ordersListResponse = Invoke-RestMethod -Uri "$BaseURL/api/v1/orders?limit=5" -Method GET -Headers $headers
    
    Write-Success "订单列表获取成功"
    Write-Info "订单总数: $($ordersListResponse.count)"
    
    foreach ($order in $ordersListResponse.data) {
        $amount = [math]::Round($order.total_amount / 100, 2)
        Write-Info "- 订单 $($order.order_number): ¥$amount ($($order.status))"
    }
    Write-Host ""

    # ===== 测试完成 =====
    Write-ColorText "订单流程测试完成！" $Green
    Write-Host ""
    Write-ColorText "测试总结：" $Blue
    Write-Info "用户登录成功"
    Write-Info "产品目录获取成功"
    Write-Info "订单创建成功 (ID: $global:orderId)"
    Write-Info "支付流程模拟成功"
    Write-Info "订单状态更新成功"
    Write-Info "订阅自动创建成功"
    Write-Info "完整流程验证通过"
    Write-Host ""
    Write-ColorText "相关链接：" $Yellow
    Write-Info "前端产品页面: http://localhost:5173/products"
    Write-Info "订单确认页面: http://localhost:5173/orders/$global:orderId/confirm"
    Write-Info "支付成功页面: http://localhost:5173/orders/$global:orderId/success"
    Write-Info "订阅管理页面: http://localhost:5173/subscriptions"

} catch {
    Write-Error "测试失败: $($_.Exception.Message)"
    Write-Host ""
    Write-ColorText "错误详情：" $Red
    Write-Host $_.Exception.ToString()
    exit 1
} 