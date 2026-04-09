---
sidebar_position: 9
---

# 优惠券系统

租户优惠券系统允许组织独立管理自己的折扣和促销活动。

## 功能特性

-   **租户隔离**: 优惠券仅属于特定租户，不能在其他地方使用。
-   **折扣类型**:
    -   **百分比**: 例如打 8 折。
    -   **固定金额**: 例如减 10 元。
-   **约束**: 最大兑换次数、过期日期。

## API 使用

所有端点位于 `/api/v1/admin/subscription/coupons` (租户管理员)。

### 创建优惠券

```http
POST /api/v1/admin/subscription/coupons
Authorization: Bearer <tenant_admin_token>

{
  "code": "WELCOME20",
  "name": "Welcome Discount",
  "discount_type": "percent",
  "discount_value": 2000,
  "duration": "once",
  "max_redemptions": 100
}
```
*注意: 百分比的 `discount_value` 以基点表示 (2000 = 20.00%)。*

### 验证优惠券

```http
GET /api/v1/admin/subscription/coupons/WELCOME20/validate
```

## 数据模型

-   **Code**: 唯一标识符 (租户内)。
-   **IsActive**: 优惠券是否可兑换。
-   **RedeemedCount**: 跟踪使用次数。
