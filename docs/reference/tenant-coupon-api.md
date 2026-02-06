# 租户优惠券管理 API 文档

本文档描述了BasaltPass系统中租户级别的优惠券管理API。所有API都需要在租户上下文中调用。

## 基础信息

- **基础路径**: `/api/v1/admin/subscription/coupons`
- **认证方式**: JWT Token (需要租户管理员权限)
- **内容类型**: `application/json`

## API 端点

### 1. 创建优惠券

**POST** `/api/v1/admin/subscription/coupons`

创建一个新的优惠券。

#### 请求体

```json
{
  "code": "SUMMER2024",
  "name": "夏季促销优惠券",
  "discount_type": "percent",
  "discount_value": 2000,
  "duration": "once",
  "duration_in_cycles": null,
  "max_redemptions": 100,
  "expires_at": "2024-12-31T23:59:59Z",
  "is_active": true,
  "metadata": {
    "campaign": "summer_sale_2024",
    "description": "夏季大促销活动专用优惠券"
  }
}
```

#### 字段说明

- `code` (string, 必需): 优惠券代码，在租户内唯一
- `name` (string, 可选): 优惠券名称
- `discount_type` (string, 必需): 折扣类型
  - `"percent"`: 百分比折扣
  - `"fixed"`: 固定金额折扣
- `discount_value` (integer, 必需): 折扣值
  - 百分比折扣：以基点为单位 (2000 = 20%)
  - 固定折扣：以分为单位 (1000 = 10.00元)
- `duration` (string, 可选): 优惠券持续时间，默认 "once"
  - `"once"`: 只能使用一次
  - `"repeating"`: 可重复使用指定周期数
  - `"forever"`: 永久有效
- `duration_in_cycles` (integer, 可选): 当duration为"repeating"时的周期数
- `max_redemptions` (integer, 可选): 最大使用次数限制
- `expires_at` (string, 可选): 过期时间 (ISO 8601格式)
- `is_active` (boolean, 可选): 是否激活，默认true
- `metadata` (object, 可选): 元数据

#### 响应

```json
{
  "data": {
    "id": 123,
    "code": "SUMMER2024",
    "name": "夏季促销优惠券",
    "discount_type": "percent",
    "discount_value": 2000,
    "duration": "once",
    "duration_in_cycles": null,
    "max_redemptions": 100,
    "redeemed_count": 0,
    "expires_at": "2024-12-31T23:59:59Z",
    "is_active": true,
    "metadata": {
      "campaign": "summer_sale_2024",
      "description": "夏季大促销活动专用优惠券"
    },
    "created_at": "2024-08-01T10:00:00Z",
    "updated_at": "2024-08-01T10:00:00Z"
  },
  "message": "优惠券创建成功"
}
```

### 2. 获取优惠券列表

**GET** `/api/v1/admin/subscription/coupons`

获取租户的优惠券列表，支持分页和过滤。

#### 查询参数

- `page` (integer, 可选): 页码，默认1
- `page_size` (integer, 可选): 每页数量，默认20
- `code` (string, 可选): 按优惠券代码过滤（模糊匹配）
- `discount_type` (string, 可选): 按折扣类型过滤
- `is_active` (boolean, 可选): 按激活状态过滤

#### 示例请求

```
GET /api/v1/admin/subscription/coupons?page=1&page_size=10&is_active=true&discount_type=percent
```

#### 响应

```json
{
  "data": [
    {
      "id": 123,
      "code": "SUMMER2024",
      "name": "夏季促销优惠券",
      "discount_type": "percent",
      "discount_value": 2000,
      "duration": "once",
      "duration_in_cycles": null,
      "max_redemptions": 100,
      "redeemed_count": 15,
      "expires_at": "2024-12-31T23:59:59Z",
      "is_active": true,
      "metadata": {},
      "created_at": "2024-08-01T10:00:00Z",
      "updated_at": "2024-08-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

### 3. 获取优惠券详情

**GET** `/api/v1/admin/subscription/coupons/{code}`

根据优惠券代码获取详细信息。

#### 路径参数

- `code` (string): 优惠券代码

#### 响应

```json
{
  "data": {
    "id": 123,
    "code": "SUMMER2024",
    "name": "夏季促销优惠券",
    "discount_type": "percent",
    "discount_value": 2000,
    "duration": "once",
    "duration_in_cycles": null,
    "max_redemptions": 100,
    "redeemed_count": 15,
    "expires_at": "2024-12-31T23:59:59Z",
    "is_active": true,
    "metadata": {
      "campaign": "summer_sale_2024"
    },
    "created_at": "2024-08-01T10:00:00Z",
    "updated_at": "2024-08-01T15:30:00Z"
  }
}
```

### 4. 更新优惠券

**PUT** `/api/v1/admin/subscription/coupons/{code}`

更新现有优惠券的信息。

#### 路径参数

- `code` (string): 优惠券代码

#### 请求体

```json
{
  "name": "秋季促销优惠券",
  "discount_value": 2500,
  "max_redemptions": 200,
  "expires_at": "2024-11-30T23:59:59Z",
  "is_active": false,
  "metadata": {
    "campaign": "autumn_sale_2024",
    "updated_reason": "延长活动时间"
  }
}
```

#### 字段说明

所有字段都是可选的，只更新提供的字段：

- `name` (string): 优惠券名称
- `discount_value` (integer): 折扣值
- `max_redemptions` (integer): 最大使用次数
- `expires_at` (string): 过期时间
- `is_active` (boolean): 激活状态
- `metadata` (object): 元数据

#### 响应

```json
{
  "data": {
    "id": 123,
    "code": "SUMMER2024",
    "name": "秋季促销优惠券",
    "discount_type": "percent",
    "discount_value": 2500,
    "duration": "once",
    "duration_in_cycles": null,
    "max_redemptions": 200,
    "redeemed_count": 15,
    "expires_at": "2024-11-30T23:59:59Z",
    "is_active": false,
    "metadata": {
      "campaign": "autumn_sale_2024",
      "updated_reason": "延长活动时间"
    },
    "created_at": "2024-08-01T10:00:00Z",
    "updated_at": "2024-08-01T16:45:00Z"
  },
  "message": "优惠券更新成功"
}
```

### 5. 删除优惠券

**DELETE** `/api/v1/admin/subscription/coupons/{code}`

删除指定的优惠券。注意：如果优惠券已经被使用（有关联的订阅），则无法删除。

#### 路径参数

- `code` (string): 优惠券代码

#### 响应

**成功删除:**
```json
{
  "message": "优惠券删除成功"
}
```

**删除失败（优惠券已被使用）:**
```json
{
  "error": "优惠券已被使用，无法删除"
}
```

### 6. 验证优惠券

**GET** `/api/v1/admin/subscription/coupons/{code}/validate`

验证优惠券是否可用。这个端点会检查优惠券的激活状态、过期时间和使用次数限制。

#### 路径参数

- `code` (string): 优惠券代码

#### 响应

**优惠券有效:**
```json
{
  "valid": true,
  "data": {
    "id": 123,
    "code": "SUMMER2024",
    "name": "夏季促销优惠券",
    "discount_type": "percent",
    "discount_value": 2000,
    "duration": "once",
    "max_redemptions": 100,
    "redeemed_count": 15,
    "expires_at": "2024-12-31T23:59:59Z",
    "is_active": true,
    "metadata": {}
  }
}
```

**优惠券无效:**
```json
{
  "valid": false,
  "error": "优惠券已过期"
}
```

## 错误代码

| HTTP状态码 | 错误类型 | 描述 |
|-----------|---------|------|
| 400 | Bad Request | 请求参数错误或优惠券代码无效 |
| 401 | Unauthorized | 未认证或token无效 |
| 403 | Forbidden | 无权限访问（需要租户管理员权限） |
| 404 | Not Found | 优惠券不存在 |
| 409 | Conflict | 优惠券代码已存在 |
| 500 | Internal Server Error | 服务器内部错误 |

## 使用示例

### 创建百分比折扣优惠券

```bash
curl -X POST "https://api.basaltpass.com/api/v1/admin/subscription/coupons" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME20",
    "name": "欢迎新用户20%折扣",
    "discount_type": "percent",
    "discount_value": 2000,
    "duration": "once",
    "max_redemptions": 500,
    "expires_at": "2024-12-31T23:59:59Z"
  }'
```

### 创建固定金额折扣优惠券

```bash
curl -X POST "https://api.basaltpass.com/api/v1/admin/subscription/coupons" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE50",
    "name": "立减50元",
    "discount_type": "fixed",
    "discount_value": 5000,
    "duration": "once",
    "max_redemptions": 200
  }'
```

### 获取活跃的优惠券列表

```bash
curl -X GET "https://api.basaltpass.com/api/v1/admin/subscription/coupons?is_active=true&page=1&page_size=20" \
  -H "Authorization: Bearer your-jwt-token"
```

### 验证优惠券

```bash
curl -X GET "https://api.basaltpass.com/api/v1/admin/subscription/coupons/WELCOME20/validate" \
  -H "Authorization: Bearer your-jwt-token"
```

## 注意事项

1. **租户隔离**: 所有优惠券操作都在当前租户范围内，不能访问其他租户的优惠券
2. **代码唯一性**: 优惠券代码在租户内必须唯一
3. **删除限制**: 已被使用的优惠券无法删除，只能停用
4. **权限要求**: 需要租户管理员权限才能进行优惠券管理操作
5. **折扣值格式**: 
   - 百分比折扣以基点为单位（100基点=1%）
   - 固定金额折扣以分为单位（100分=1元）
6. **时区处理**: 所有时间都使用UTC时区，客户端需要进行相应转换
