# 租户级应用管理API实现总结

## 后端实现

### 1. 新增 `tenant_handler.go` 文件
位置：`basaltpass-backend/internal/app/tenant_handler.go`

包含以下功能：
- **TenantListAppsHandler**: 租户获取应用列表 `GET /api/v1/tenant/apps`
- **TenantGetAppHandler**: 租户获取应用详情 `GET /api/v1/tenant/apps/:id`
- **TenantGetAppStatsHandler**: 租户获取应用统计 `GET /api/v1/tenant/apps/:id/stats`

### 2. 路由配置更新
在 `router.go` 中添加了租户级应用管理路由：

```go
// 租户应用管理路由
tenantAppGroup := tenantGroup.Group("/apps")

// 租户基础应用管理路由
tenantAppGroup.Get("/", appHandler.TenantListAppsHandler)
tenantAppGroup.Get("/:id", appHandler.TenantGetAppHandler)
tenantAppGroup.Get("/:id/stats", appHandler.TenantGetAppStatsHandler)
```

## 前端实现

### 1. 应用管理API扩展
在 `basaltpass-frontend/src/api/app.ts` 中新增 `tenantAppApi` 对象，包含：

#### 基础应用管理
- `listApps(page, limit, search)` - 获取应用列表
- `getApp(id)` - 获取应用详情
- `getAppStats(appId, period)` - 获取应用统计

#### 应用权限管理
- `listAppPermissions(appId)` - 获取应用权限列表
- `createAppPermission(appId, data)` - 创建应用权限
- `updateAppPermission(appId, permissionId, data)` - 更新应用权限
- `deleteAppPermission(appId, permissionId)` - 删除应用权限

#### 应用角色管理
- `listAppRoles(appId)` - 获取应用角色列表
- `createAppRole(appId, data)` - 创建应用角色
- `updateAppRole(appId, roleId, data)` - 更新应用角色
- `deleteAppRole(appId, roleId)` - 删除应用角色

#### 应用用户管理
- `listAppUsers(appId, page, limit)` - 获取应用用户列表
- `getAppUsersByStatus(appId, status, page, limit)` - 按状态获取应用用户
- `getAppUserStats(appId)` - 获取应用用户统计
- `updateAppUserStatus(appId, userId, status)` - 更新应用用户状态

#### 应用用户权限管理
- `getUserPermissions(appId, userId)` - 获取用户权限
- `grantUserPermissions(appId, userId, permissionIds)` - 授予用户权限
- `revokeUserPermission(appId, userId, permissionId)` - 撤销用户权限
- `assignUserRoles(appId, userId, roleIds)` - 分配用户角色
- `revokeUserRole(appId, userId, roleId)` - 撤销用户角色

### 2. OAuth客户端管理API扩展
在 `basaltpass-frontend/src/api/oauth.ts` 中新增 `tenantOAuthApi` 对象，包含：

- `listClients(page, pageSize, search)` - 获取OAuth客户端列表
- `createClient(data)` - 创建OAuth客户端
- `updateClient(clientId, data)` - 更新OAuth客户端
- `deleteClient(clientId)` - 删除OAuth客户端
- `regenerateSecret(clientId)` - 重新生成客户端密钥

## API端点总结

### 租户应用管理端点
- `GET /api/v1/tenant/apps?page=1&limit=20` - 获取租户应用列表
- `GET /api/v1/tenant/apps/:id` - 获取应用详情
- `GET /api/v1/tenant/apps/:id/stats?period=7d` - 获取应用统计

### 租户OAuth客户端管理端点
- `GET /api/v1/tenant/oauth/clients` - 获取OAuth客户端列表
- `POST /api/v1/tenant/oauth/clients` - 创建OAuth客户端
- `PUT /api/v1/tenant/oauth/clients/:client_id` - 更新OAuth客户端
- `DELETE /api/v1/tenant/oauth/clients/:client_id` - 删除OAuth客户端
- `POST /api/v1/tenant/oauth/clients/:client_id/regenerate-secret` - 重新生成密钥

## 使用说明

### 前端使用示例

```typescript
import { tenantAppApi, tenantOAuthApi } from '@/api/app'
import { tenantOAuthApi } from '@/api/oauth'

// 获取租户应用列表
const { data } = await tenantAppApi.listApps(1, 20)

// 获取应用统计
const stats = await tenantAppApi.getAppStats('app_id', '7d')

// 管理OAuth客户端
const clients = await tenantOAuthApi.listClients()
```

### 权限要求
- 所有租户级API都需要JWT认证
- 需要通过租户中间件验证租户上下文
- 只能访问当前租户下的资源

## 特性
1. **多租户隔离**: 确保租户只能访问自己的应用和OAuth客户端
2. **完整的RBAC支持**: 包括权限和角色管理
3. **用户管理**: 支持应用用户状态管理和权限分配
4. **统计功能**: 提供应用使用统计信息
5. **分页支持**: 所有列表接口都支持分页
6. **搜索功能**: 支持按名称搜索应用
