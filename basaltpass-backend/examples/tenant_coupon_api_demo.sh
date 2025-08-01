#!/bin/bash

# BasaltPass 租户优惠券管理 API 示例脚本
# 此脚本演示如何使用租户优惠券管理的各个API端点

# 配置变量
BASE_URL="http://localhost:8080"
JWT_TOKEN="your-jwt-token-here"
TENANT_HEADER="X-Tenant-ID: your-tenant-id"

echo "=== BasaltPass 租户优惠券管理 API 示例 ==="
echo "基础URL: $BASE_URL"
echo "请确保已设置正确的JWT_TOKEN和租户ID"
echo ""

# 1. 创建百分比折扣优惠券
echo "1. 创建百分比折扣优惠券..."
curl -X POST "$BASE_URL/api/v1/admin/subscription/coupons" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "$TENANT_HEADER" \
  -d '{
    "code": "WELCOME20",
    "name": "欢迎新用户20%折扣",
    "discount_type": "percent",
    "discount_value": 2000,
    "duration": "once",
    "max_redemptions": 100,
    "expires_at": "2024-12-31T23:59:59Z",
    "metadata": {
      "campaign": "welcome_campaign",
      "description": "新用户欢迎优惠"
    }
  }' | jq '.'
echo ""

# 2. 创建固定金额折扣优惠券
echo "2. 创建固定金额折扣优惠券..."
curl -X POST "$BASE_URL/api/v1/admin/subscription/coupons" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "$TENANT_HEADER" \
  -d '{
    "code": "SAVE50",
    "name": "立减50元",
    "discount_type": "fixed",
    "discount_value": 5000,
    "duration": "once",
    "max_redemptions": 50
  }' | jq '.'
echo ""

# 3. 创建重复使用的优惠券
echo "3. 创建重复使用的优惠券..."
curl -X POST "$BASE_URL/api/v1/admin/subscription/coupons" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "$TENANT_HEADER" \
  -d '{
    "code": "MONTHLY10",
    "name": "月度10%折扣",
    "discount_type": "percent",
    "discount_value": 1000,
    "duration": "repeating",
    "duration_in_cycles": 3,
    "max_redemptions": 200
  }' | jq '.'
echo ""

# 4. 获取优惠券列表
echo "4. 获取优惠券列表..."
curl -X GET "$BASE_URL/api/v1/admin/subscription/coupons?page=1&page_size=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "$TENANT_HEADER" | jq '.'
echo ""

# 5. 获取特定优惠券详情
echo "5. 获取优惠券详情 (WELCOME20)..."
curl -X GET "$BASE_URL/api/v1/admin/subscription/coupons/WELCOME20" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "$TENANT_HEADER" | jq '.'
echo ""

# 6. 验证优惠券
echo "6. 验证优惠券 (WELCOME20)..."
curl -X GET "$BASE_URL/api/v1/admin/subscription/coupons/WELCOME20/validate" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "$TENANT_HEADER" | jq '.'
echo ""

# 7. 更新优惠券
echo "7. 更新优惠券 (WELCOME20)..."
curl -X PUT "$BASE_URL/api/v1/admin/subscription/coupons/WELCOME20" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "$TENANT_HEADER" \
  -d '{
    "name": "欢迎新用户25%折扣",
    "discount_value": 2500,
    "max_redemptions": 150,
    "metadata": {
      "campaign": "welcome_campaign_v2",
      "description": "升级的新用户欢迎优惠",
      "updated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' | jq '.'
echo ""

# 8. 筛选优惠券 - 获取百分比折扣的活跃优惠券
echo "8. 筛选优惠券 - 获取百分比折扣的活跃优惠券..."
curl -X GET "$BASE_URL/api/v1/admin/subscription/coupons?discount_type=percent&is_active=true" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "$TENANT_HEADER" | jq '.'
echo ""

# 9. 停用优惠券（而不是删除）
echo "9. 停用优惠券 (SAVE50)..."
curl -X PUT "$BASE_URL/api/v1/admin/subscription/coupons/SAVE50" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "$TENANT_HEADER" \
  -d '{
    "is_active": false,
    "metadata": {
      "deactivated_reason": "活动结束",
      "deactivated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' | jq '.'
echo ""

# 10. 尝试验证已停用的优惠券
echo "10. 验证已停用的优惠券 (SAVE50)..."
curl -X GET "$BASE_URL/api/v1/admin/subscription/coupons/SAVE50/validate" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "$TENANT_HEADER" | jq '.'
echo ""

# 11. 删除优惠券（如果没有被使用）
echo "11. 删除优惠券 (MONTHLY10)..."
curl -X DELETE "$BASE_URL/api/v1/admin/subscription/coupons/MONTHLY10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "$TENANT_HEADER" | jq '.'
echo ""

# 12. 最终状态 - 获取所有优惠券
echo "12. 最终状态 - 获取所有优惠券..."
curl -X GET "$BASE_URL/api/v1/admin/subscription/coupons" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "$TENANT_HEADER" | jq '.'
echo ""

echo "=== 示例脚本执行完成 ==="
echo ""
echo "注意事项："
echo "1. 请替换 JWT_TOKEN 为实际的认证令牌"
echo "2. 请设置正确的租户ID"
echo "3. 确保服务器正在运行在 $BASE_URL"
echo "4. 需要安装 jq 工具来格式化JSON输出"
echo ""
echo "错误处理示例："
echo "- 尝试创建重复代码的优惠券"
echo "- 尝试获取不存在的优惠券"
echo "- 尝试删除已被使用的优惠券"
