# BasaltPass 租户优惠券管理 API 示例脚本 (PowerShell)
# 此脚本演示如何使用租户优惠券管理的各个API端点

# 配置变量
$BASE_URL = "http://localhost:8080"
$JWT_TOKEN = "your-jwt-token-here"
$TENANT_ID = "your-tenant-id"

Write-Host "=== BasaltPass 租户优惠券管理 API 示例 ===" -ForegroundColor Green
Write-Host "基础URL: $BASE_URL" -ForegroundColor Yellow
Write-Host "请确保已设置正确的JWT_TOKEN和租户ID" -ForegroundColor Yellow
Write-Host ""

# 通用请求函数
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Body = $null,
        [string]$Description
    )
    
    Write-Host "$Description..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $JWT_TOKEN"
        "Content-Type" = "application/json"
        "X-Tenant-ID" = $TENANT_ID
    }
    
    try {
        $params = @{
            Uri = "$BASE_URL$Uri"
            Method = $Method
            Headers = $headers
        }
        
        if ($Body -and $Method -ne "GET") {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-RestMethod @params
        $response | ConvertTo-Json -Depth 10 | Write-Host
        Write-Host ""
        return $response
    }
    catch {
        Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

# 1. 创建百分比折扣优惠券
$coupon1 = @{
    code = "WELCOME20"
    name = "欢迎新用户20%折扣"
    discount_type = "percent"
    discount_value = 2000
    duration = "once"
    max_redemptions = 100
    expires_at = "2024-12-31T23:59:59Z"
    metadata = @{
        campaign = "welcome_campaign"
        description = "新用户欢迎优惠"
    }
}

Invoke-ApiRequest -Method "POST" -Uri "/api/v1/admin/subscription/coupons" -Body $coupon1 -Description "1. 创建百分比折扣优惠券"

# 2. 创建固定金额折扣优惠券
$coupon2 = @{
    code = "SAVE50"
    name = "立减50元"
    discount_type = "fixed"
    discount_value = 5000
    duration = "once"
    max_redemptions = 50
}

Invoke-ApiRequest -Method "POST" -Uri "/api/v1/admin/subscription/coupons" -Body $coupon2 -Description "2. 创建固定金额折扣优惠券"

# 3. 创建重复使用的优惠券
$coupon3 = @{
    code = "MONTHLY10"
    name = "月度10%折扣"
    discount_type = "percent"
    discount_value = 1000
    duration = "repeating"
    duration_in_cycles = 3
    max_redemptions = 200
}

Invoke-ApiRequest -Method "POST" -Uri "/api/v1/admin/subscription/coupons" -Body $coupon3 -Description "3. 创建重复使用的优惠券"

# 4. 获取优惠券列表
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons?page=1&page_size=10" -Description "4. 获取优惠券列表"

# 5. 获取特定优惠券详情
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons/WELCOME20" -Description "5. 获取优惠券详情 (WELCOME20)"

# 6. 验证优惠券
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons/WELCOME20/validate" -Description "6. 验证优惠券 (WELCOME20)"

# 7. 更新优惠券
$updateData = @{
    name = "欢迎新用户25%折扣"
    discount_value = 2500
    max_redemptions = 150
    metadata = @{
        campaign = "welcome_campaign_v2"
        description = "升级的新用户欢迎优惠"
        updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
}

Invoke-ApiRequest -Method "PUT" -Uri "/api/v1/admin/subscription/coupons/WELCOME20" -Body $updateData -Description "7. 更新优惠券 (WELCOME20)"

# 8. 筛选优惠券 - 获取百分比折扣的活跃优惠券
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons?discount_type=percent&is_active=true" -Description "8. 筛选优惠券 - 获取百分比折扣的活跃优惠券"

# 9. 停用优惠券（而不是删除）
$deactivateData = @{
    is_active = $false
    metadata = @{
        deactivated_reason = "活动结束"
        deactivated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
}

Invoke-ApiRequest -Method "PUT" -Uri "/api/v1/admin/subscription/coupons/SAVE50" -Body $deactivateData -Description "9. 停用优惠券 (SAVE50)"

# 10. 尝试验证已停用的优惠券
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons/SAVE50/validate" -Description "10. 验证已停用的优惠券 (SAVE50)"

# 11. 删除优惠券（如果没有被使用）
Invoke-ApiRequest -Method "DELETE" -Uri "/api/v1/admin/subscription/coupons/MONTHLY10" -Description "11. 删除优惠券 (MONTHLY10)"

# 12. 最终状态 - 获取所有优惠券
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons" -Description "12. 最终状态 - 获取所有优惠券"

Write-Host "=== 示例脚本执行完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "注意事项：" -ForegroundColor Yellow
Write-Host "1. 请替换 JWT_TOKEN 为实际的认证令牌"
Write-Host "2. 请设置正确的租户ID"
Write-Host "3. 确保服务器正在运行在 $BASE_URL"
Write-Host ""
Write-Host "错误处理示例：" -ForegroundColor Yellow
Write-Host "- 尝试创建重复代码的优惠券"
Write-Host "- 尝试获取不存在的优惠券"
Write-Host "- 尝试删除已被使用的优惠券"

# 额外的测试用例
Write-Host ""
Write-Host "=== 额外测试用例 ===" -ForegroundColor Magenta

# 测试错误情况
Write-Host "测试错误情况：" -ForegroundColor Yellow

# 1. 尝试创建重复代码的优惠券
$duplicateCoupon = @{
    code = "WELCOME20"  # 重复代码
    name = "重复优惠券"
    discount_type = "percent"
    discount_value = 1000
    duration = "once"
}

Invoke-ApiRequest -Method "POST" -Uri "/api/v1/admin/subscription/coupons" -Body $duplicateCoupon -Description "尝试创建重复代码的优惠券"

# 2. 尝试获取不存在的优惠券
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons/NONEXISTENT" -Description "尝试获取不存在的优惠券"

# 3. 尝试验证不存在的优惠券
Invoke-ApiRequest -Method "GET" -Uri "/api/v1/admin/subscription/coupons/NONEXISTENT/validate" -Description "尝试验证不存在的优惠券"
