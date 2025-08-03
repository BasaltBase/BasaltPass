# 租户信息API实现总结

## 后端实现

### 1. 新增 `TenantGetInfoHandler` 函数
位置：`basaltpass-backend/internal/tenant/handler.go`

```go
// TenantGetInfoHandler 租户获取自己的信息
// GET /api/v1/tenant/info
func TenantGetInfoHandler(c *fiber.Ctx) error {
	// 从JWT中间件获取租户ID
	tenantID := c.Locals("tenantID").(uint)

	info, err := tenantService.GetTenantInfo(tenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    info,
		"message": "获取租户信息成功",
	})
}
```

### 2. 路由配置更新
在 `router.go` 中添加了租户信息管理路由：

```go
// 租户级别的路由（直接在v1下面）
tenantGroup := v1.Group("/tenant", middleware.JWTMiddleware(), middleware.TenantMiddleware())

// 租户信息管理
tenantGroup.Get("/info", tenant.TenantGetInfoHandler)
```

### 3. 复用现有服务
- 复用了现有的 `tenantService.GetTenantInfo(tenantID)` 方法
- 复用了现有的 `TenantInfo` 数据结构

## 前端实现

### 1. 租户信息API扩展
在 `basaltpass-frontend/src/api/tenant.ts` 中新增 `tenantSelfApi` 对象：

```typescript
// 租户级别API (/tenant) - 用于租户自己获取信息
export const tenantSelfApi = {
  // 获取当前租户信息
  async getTenantInfo(): Promise<{ data: TenantInfo }> {
    const response = await client.get('/api/v1/tenant/info')
    return response.data
  }
}
```

### 2. 类型定义
复用了现有的 `TenantInfo` 接口：

```typescript
export interface TenantInfo {
  id: number
  name: string
  code: string
  description: string
  status: 'active' | 'suspended' | 'deleted'
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
  stats: TenantDetailStats
  quota?: TenantQuotaInfo
}

export interface TenantDetailStats {
  total_users: number
  total_apps: number
  active_apps: number
  total_clients: number
  active_tokens: number
}

export interface TenantQuotaInfo {
  max_apps: number
  max_users: number
  max_tokens_per_hour: number
}
```

## API端点

### 新增API端点
- `GET /api/v1/tenant/info` - 租户获取自己的信息

### 对比现有管理员API
- 管理员API: `GET /api/v1/admin/tenant/info` - 租户管理员获取租户信息
- 租户API: `GET /api/v1/tenant/info` - 租户获取自己的信息

## 数据返回格式

```json
{
  "data": {
    "id": 1,
    "name": "示例租户",
    "code": "example-tenant",
    "description": "这是一个示例租户",
    "status": "active",
    "plan": "pro",
    "created_at": "2024-01-01 00:00:00",
    "updated_at": "2024-01-01 00:00:00",
    "stats": {
      "total_users": 10,
      "total_apps": 5,
      "active_apps": 4,
      "total_clients": 8,
      "active_tokens": 15
    },
    "quota": {
      "max_apps": 20,
      "max_users": 100,
      "max_tokens_per_hour": 1000
    }
  },
  "message": "获取租户信息成功"
}
```

## 使用说明

### 前端使用示例

```typescript
import { tenantSelfApi } from '@/api/tenant'

// 获取当前租户信息
const { data } = await tenantSelfApi.getTenantInfo()
console.log('租户信息:', data)
```

### 权限要求
- 需要JWT认证
- 需要通过租户中间件验证租户上下文
- 租户只能获取自己的信息，无法访问其他租户的信息

## 特性
1. **多租户隔离**: 通过 `TenantMiddleware` 确保租户只能访问自己的信息
2. **完整统计**: 包含用户数、应用数、OAuth客户端数等详细统计
3. **配额信息**: 显示租户的配额限制
4. **类型安全**: 前端使用TypeScript提供完整的类型定义
5. **复用现有逻辑**: 后端复用现有的服务方法，保持代码一致性
