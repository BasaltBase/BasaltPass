# 租户优惠券管理系统

本文档介绍了BasaltPass系统中新增的租户级优惠券管理功能。

## 概述

租户优惠券管理系统允许每个租户独立管理自己的优惠券，实现完全的租户隔离。每个租户可以创建、管理和使用自己的优惠券，而不会影响其他租户。

## 主要特性

### 🎯 完整的CRUD操作
- ✅ 创建优惠券
- ✅ 查看优惠券列表（支持分页和筛选）
- ✅ 获取优惠券详情
- ✅ 更新优惠券信息
- ✅ 删除优惠券
- ✅ 验证优惠券有效性

### 🏢 租户隔离
- ✅ 优惠券在租户范围内唯一
- ✅ 租户之间完全隔离
- ✅ 支持租户级优惠券统计

### 💰 灵活的折扣类型
- ✅ 百分比折扣（如：20% off）
- ✅ 固定金额折扣（如：减50元）
- ✅ 支持不同的持续时间设置

### ⚙️ 高级功能
- ✅ 使用次数限制
- ✅ 过期时间设置
- ✅ 激活状态控制
- ✅ 自定义元数据存储
- ✅ 自动使用次数统计

## 技术架构

### 数据模型

优惠券模型包含以下字段：

```go
type Coupon struct {
    ID               uint                   // 主键
    TenantID         *uint64                // 租户ID（支持租户隔离）
    Code             string                 // 优惠券代码
    Name             string                 // 优惠券名称
    DiscountType     DiscountType           // 折扣类型（percent/fixed）
    DiscountValue    int64                  // 折扣值
    Duration         CouponDuration         // 持续时间类型
    DurationInCycles *int                   // 持续周期数
    MaxRedemptions   *int                   // 最大使用次数
    RedeemedCount    int                    // 已使用次数
    ExpiresAt        *time.Time             // 过期时间
    IsActive         bool                   // 激活状态
    Metadata         JSONB                  // 元数据
    CreatedAt        time.Time              // 创建时间
    UpdatedAt        time.Time              // 更新时间
}
```

### API端点

所有API端点都在租户管理员路由组下：

```
BASE: /api/v1/admin/subscription/coupons
```

| HTTP方法 | 端点 | 功能 |
|---------|------|------|
| POST | `/` | 创建优惠券 |
| GET | `/` | 获取优惠券列表 |
| GET | `/{code}` | 获取优惠券详情 |
| PUT | `/{code}` | 更新优惠券 |
| DELETE | `/{code}` | 删除优惠券 |
| GET | `/{code}/validate` | 验证优惠券 |

### 服务层

优惠券服务提供以下核心方法：

- `CreateCoupon()` - 创建优惠券
- `ListCoupons()` - 获取优惠券列表
- `GetCoupon()` - 获取优惠券详情
- `UpdateCoupon()` - 更新优惠券
- `DeleteCoupon()` - 删除优惠券
- `ValidateCoupon()` - 验证优惠券

## 文件结构

```
basaltpass-backend/
├── internal/
│   ├── model/
│   │   └── subscription_models.go        # 优惠券数据模型
│   └── subscription/
│       ├── tenant_service.go             # 租户优惠券服务实现
│       ├── tenant_handler.go             # 租户优惠券HTTP处理器
│       ├── tenant_coupon_test.go         # 单元测试
│       ├── dto.go                        # 请求/响应数据结构
│       └── coupon_tenant_migration.sql   # 数据库迁移脚本
├── docs/
│   └── TENANT_COUPON_API.md              # API文档
└── examples/
    ├── tenant_coupon_api_demo.sh         # Bash示例脚本
    └── tenant_coupon_api_demo.ps1        # PowerShell示例脚本
```

## 数据库支持

### 迁移脚本

提供了完整的数据库迁移脚本：
- `coupon_tenant_migration.sql` - 添加租户支持和相关约束

### 数据库索引

为了优化查询性能，创建了以下索引：
- `idx_coupons_tenant_id` - 租户ID索引
- `idx_coupons_tenant_active` - 租户+激活状态复合索引
- `idx_coupons_tenant_expires` - 租户+过期时间复合索引
- `idx_coupons_tenant_type` - 租户+折扣类型复合索引

### 唯一约束

- `uk_coupons_tenant_code` - 确保优惠券代码在租户范围内唯一

## 使用示例

### 创建优惠券

```bash
curl -X POST "/api/v1/admin/subscription/coupons" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME20",
    "name": "欢迎新用户20%折扣",
    "discount_type": "percent",
    "discount_value": 2000,
    "duration": "once",
    "max_redemptions": 100
  }'
```

### 获取优惠券列表

```bash
curl -X GET "/api/v1/admin/subscription/coupons?page=1&page_size=20&is_active=true" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 验证优惠券

```bash
curl -X GET "/api/v1/admin/subscription/coupons/WELCOME20/validate" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 测试

### 单元测试

提供了完整的单元测试覆盖：
- 优惠券CRUD操作测试
- 租户隔离测试
- 元数据功能测试
- 验证逻辑测试

运行测试：
```bash
go test ./internal/subscription -v -run TestTenantCoupon
```

### 示例脚本

提供了两个示例脚本来演示API使用：
- `tenant_coupon_api_demo.sh` - Linux/macOS Bash脚本
- `tenant_coupon_api_demo.ps1` - Windows PowerShell脚本

## 安全性和权限

### 权限要求
- 需要有效的JWT认证令牌
- 需要租户管理员权限
- 自动应用租户上下文中间件

### 数据隔离
- 所有操作都在租户范围内进行
- 无法访问其他租户的优惠券
- 支持null租户ID用于全局优惠券

## 性能优化

### 数据库优化
- 合理的索引设计
- 分页查询支持
- 复合索引优化多条件查询

### 查询优化
- 支持按多种条件筛选
- 预编译查询语句
- 避免N+1查询问题

## 监控和统计

### 统计视图
- `tenant_coupon_stats` - 租户优惠券统计视图
- `tenant_coupon_usage` - 租户优惠券使用明细视图

### 清理功能
- `cleanup_expired_coupons()` - 自动清理过期优惠券
- `update_coupon_redemption_count()` - 自动更新使用次数

## 未来扩展

### 计划中的功能
- [ ] 优惠券使用历史记录
- [ ] 批量操作支持
- [ ] 优惠券模板功能
- [ ] A/B测试支持
- [ ] 用户群体定向

### 集成点
- 与订阅系统的深度集成
- 与支付系统的无缝对接
- 与分析系统的数据上报

## 开发指南

### 添加新的优惠券类型
1. 在 `model/subscription_models.go` 中添加新的枚举值
2. 在服务层添加相应的验证逻辑
3. 更新API文档和测试用例

### 扩展元数据功能
1. 在DTO中定义新的元数据结构
2. 在服务层添加相应的处理逻辑
3. 更新数据库视图（如需要）

### 添加新的验证规则
1. 在 `ValidateCoupon()` 方法中添加新的验证逻辑
2. 添加相应的错误处理
3. 更新单元测试

## 贡献指南

1. 确保所有新功能都有对应的单元测试
2. 更新API文档以反映变更
3. 遵循现有的代码风格和架构模式
4. 确保数据库迁移脚本向后兼容

## 支持

如有问题或建议，请通过以下方式联系：
- 创建GitHub Issue
- 查看API文档获取详细信息
- 运行示例脚本进行测试
