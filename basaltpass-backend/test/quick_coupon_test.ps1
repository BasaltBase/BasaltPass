# 简单的优惠券API测试脚本
# 此脚本用于快速验证优惠券管理API是否工作正常

$BASE_URL = "http://localhost:8080"
$JWT_TOKEN = "your-jwt-token-here"  # 需要替换为实际的JWT令牌
$TENANT_ID = "1"  # 需要替换为实际的租户ID

Write-Host "=== 快速优惠券API测试 ===" -ForegroundColor Green
Write-Host "如果您没有JWT令牌，请先登录获取令牌" -ForegroundColor Yellow
Write-Host ""

# 测试健康检查端点（不需要认证）
Write-Host "1. 测试健康检查端点..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$BASE_URL/health" -Method GET
    Write-Host "✓ 健康检查成功: $healthResponse" -ForegroundColor Green
} catch {
    Write-Host "✗ 健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 如果没有JWT令牌，显示获取令牌的说明
if ($JWT_TOKEN -eq "your-jwt-token-here") {
    Write-Host "⚠️  请先设置JWT_TOKEN变量" -ForegroundColor Yellow
    Write-Host "可以通过以下方式获取JWT令牌：" -ForegroundColor Yellow
    Write-Host "1. 使用登录API: POST $BASE_URL/api/v1/auth/login" -ForegroundColor Yellow
    Write-Host "2. 或者查看浏览器开发者工具中的认证头" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "获取令牌后，请修改此脚本中的JWT_TOKEN变量" -ForegroundColor Yellow
    exit
}

# 通用请求函数
function Test-ApiEndpoint {
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
            TimeoutSec = 10
        }
        
        if ($Body -and $Method -ne "GET") {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✓ 成功" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 3 | Write-Host
        Write-Host ""
        return $response
    }
    catch {
        Write-Host "✗ 失败: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "状态码: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
        Write-Host ""
        return $null
    }
}

# 2. 测试获取优惠券列表（应该返回空列表或现有优惠券）
Test-ApiEndpoint -Method "GET" -Uri "/api/v1/admin/subscription/coupons" -Description "2. 获取优惠券列表"

# 3. 测试创建优惠券
$testCoupon = @{
    code = "TEST20"
    name = "测试优惠券20%折扣"
    discount_type = "percent"
    discount_value = 2000  # 20%
    duration = "once"
    max_redemptions = 100
    expires_at = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
    metadata = @{
        description = "API测试优惠券"
        test = $true
    }
}

$createdCoupon = Test-ApiEndpoint -Method "POST" -Uri "/api/v1/admin/subscription/coupons" -Body $testCoupon -Description "3. 创建测试优惠券"

if ($createdCoupon) {
    # 4. 测试获取单个优惠券
    Test-ApiEndpoint -Method "GET" -Uri "/api/v1/admin/subscription/coupons/TEST20" -Description "4. 获取优惠券详情"
    
    # 5. 测试验证优惠券
    Test-ApiEndpoint -Method "GET" -Uri "/api/v1/admin/subscription/coupons/TEST20/validate" -Description "5. 验证优惠券"
    
    # 6. 测试更新优惠券
    $updateData = @{
        name = "更新后的测试优惠券"
        discount_value = 2500  # 25%
        metadata = @{
            description = "已更新的API测试优惠券"
            test = $true
            updated = $true
        }
    }
    
    Test-ApiEndpoint -Method "PUT" -Uri "/api/v1/admin/subscription/coupons/TEST20" -Body $updateData -Description "6. 更新优惠券"
    
    # 7. 测试停用优惠券
    $deactivateData = @{
        is_active = $false
    }
    
    Test-ApiEndpoint -Method "PUT" -Uri "/api/v1/admin/subscription/coupons/TEST20" -Body $deactivateData -Description "7. 停用优惠券"
    
    # 8. 再次验证优惠券（应该失败，因为已停用）
    Test-ApiEndpoint -Method "GET" -Uri "/api/v1/admin/subscription/coupons/TEST20/validate" -Description "8. 验证已停用的优惠券"
    
    # 9. 测试删除优惠券
    Test-ApiEndpoint -Method "DELETE" -Uri "/api/v1/admin/subscription/coupons/TEST20" -Description "9. 删除优惠券"
    
    # 10. 最终验证 - 优惠券应该不存在了
    Test-ApiEndpoint -Method "GET" -Uri "/api/v1/admin/subscription/coupons/TEST20" -Description "10. 验证优惠券已删除"
}

Write-Host "=== 测试完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "注意事项：" -ForegroundColor Yellow
Write-Host "1. 如果看到认证错误，请检查JWT_TOKEN是否正确" -ForegroundColor Yellow
Write-Host "2. 如果看到租户相关错误，请检查TENANT_ID是否正确" -ForegroundColor Yellow
Write-Host "3. 确保后端服务正在运行且数据库连接正常" -ForegroundColor Yellow
