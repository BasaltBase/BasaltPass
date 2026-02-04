# BasaltPass 权限系统分析

## 概述

经过代码分析，BasaltPass 确实存在**两套独立的权限系统**：

1. **全局/系统级权限系统（Admin权限）** - 用于平台管理员
2. **租户级权限系统（Tenant权限）** - 用于租户内部管理

---

## 一、全局/系统级权限系统（Admin权限）

### 1.1 核心模型

#### Permission（系统级权限）
```go
// 文件: basaltpass-backend/internal/model/permission.go
type Permission struct {
    gorm.Model
    Code string `gorm:"uniqueIndex;size:64"`  // 权限代码
    Desc string `gorm:"size:255"`              // 权限描述
}
```

#### Role（全局角色）
```go
// 文件: basaltpass-backend/internal/model/role.go
type Role struct {
    gorm.Model
    TenantID    uint   // 租户ID（0或NULL表示全局角色）
    AppID       *uint  // 应用ID（NULL表示租户级角色）
    Code        string // 角色代码
    Name        string // 角色名称
    Description string
    IsSystem    bool   // 是否为系统角色（不可删除）
}
```

#### UserRole（用户-角色关联）
```go
// 文件: basaltpass-backend/internal/model/user_role.go
type UserRole struct {
    UserID uint `gorm:"primaryKey"`
    RoleID uint `gorm:"primaryKey"`
}
```

### 1.2 特点

- **全局范围**：不属于任何租户（`tenant_id = 0` 或 `NULL`）
- **系统级权限**：如 `superadmin.tenants.create`、`superadmin.tenants.read` 等
- **超级管理员**：通过 `User.IsSuperAdmin()` 判断（基于 role_id=1）
- **API路由**：`/api/v1/admin/*` 或 `/api/v1/tenant/*`（旧路由，逐步迁移）

### 1.3 中间件

#### SuperAdminMiddleware
```go
// 文件: basaltpass-backend/internal/middleware/admin_middleware.go
// 仅允许超级管理员访问
func SuperAdminMiddleware() fiber.Handler {
    // 检查 is_super_admin 或 role_id=1
}
```

#### AdminMiddleware
```go
// 允许超级管理员或任意租户的 owner/admin
func AdminMiddleware() fiber.Handler {
    // 检查 is_super_admin 或 TenantRole = owner/admin
}
```

### 1.4 API端点示例

```
GET    /api/v1/admin/users               # 全局用户管理
POST   /api/v1/admin/users
GET    /api/v1/admin/roles               # 全局角色管理
POST   /api/v1/admin/roles
GET    /api/v1/admin/permissions         # 全局权限管理
POST   /api/v1/admin/permissions
POST   /api/v1/admin/users/:id/roles     # 分配全局角色
GET    /api/v1/admin/tenants             # 租户管理
GET    /api/v1/admin/subscriptions       # 订阅管理
```

### 1.5 使用场景

- BasaltPass 平台方管理员
- 跨租户的全局管理功能
- 系统级配置管理
- 多租户管理和监控

---

## 二、租户级权限系统（Tenant权限）

### 2.1 核心模型

#### TenantAdmin（租户管理员）
```go
// 文件: basaltpass-backend/internal/model/tenant.go
type TenantAdmin struct {
    ID       uint
    UserID   uint
    TenantID uint
    Role     TenantRole  // owner, admin, member
}

type TenantRole string
const (
    TenantRoleOwner  TenantRole = "owner"   // 所有者
    TenantRoleAdmin  TenantRole = "tenant"  // 管理员
    TenantRoleMember TenantRole = "member"  // 普通成员
)
```

#### Role（租户级角色）
```go
// 当 tenant_id != 0 且 app_id = NULL 时，表示租户级角色
type Role struct {
    TenantID    uint   `gorm:"not null"`    // 非0，表示属于某租户
    AppID       *uint  // NULL表示租户级角色
    Code        string
    Name        string
    IsSystem    bool
}
```

### 2.2 租户级RBAC系统

租户内部有完整的角色权限系统，支持：

- 创建自定义角色
- 定义角色权限
- 为用户分配角色
- 按应用划分权限

### 2.3 中间件

#### TenantMiddleware
```go
// 文件: basaltpass-backend/internal/middleware/tenant_middleware.go
// 验证用户是否属于租户
func TenantMiddleware() fiber.Handler {
    // 从JWT提取用户ID
    // 查询 tenant_admins 表验证租户关联
    // 将 tenantID 和 tenantRole 放入上下文
}
```

#### TenantOwnerMiddleware
```go
// 仅允许租户所有者
func TenantOwnerMiddleware() fiber.Handler {
    // 检查 TenantAdmin.Role == "owner"
}
```

#### TenantAdminMiddleware
```go
// 允许租户所有者或管理员
func TenantAdminMiddleware() fiber.Handler {
    // 检查 TenantAdmin.Role in ("owner", "tenant")
}
```

### 2.4 API端点示例

```
GET    /api/v1/tenant/info                    # 租户信息
GET    /api/v1/tenant/users                   # 租户用户管理
GET    /api/v1/tenant/roles                   # 租户角色管理
POST   /api/v1/tenant/roles
GET    /api/v1/tenant/apps                    # 租户应用管理
GET    /api/v1/tenant/subscriptions           # 租户订阅管理
```

### 2.5 使用场景

- 租户内部的管理功能
- 租户自己的用户管理
- 租户的应用管理
- 租户内的角色权限配置

---

## 三、应用级权限系统（App权限）

除了上述两套系统，还有第三套**应用级权限系统**：

### 3.1 核心模型

#### AppPermission（应用权限）
```go
// 文件: basaltpass-backend/internal/model/app_permission.go
type AppPermission struct {
    ID          uint
    Code        string `gorm:"uniqueIndex:idx_app_permission_code"`
    Name        string
    Description string
    Category    string
    AppID       uint      // 所属应用
    TenantID    uint      // 所属租户
}
```

#### AppRole（应用角色）
```go
// 文件: basaltpass-backend/internal/model/app_role.go
type AppRole struct {
    ID          uint
    Code        string `gorm:"uniqueIndex:idx_app_role_code"`
    Name        string
    AppID       uint      // 所属应用
    TenantID    uint      // 所属租户
    Permissions []AppPermission `gorm:"many2many:app_role_permissions"`
}
```

#### AppUserPermission & AppUserRole
```go
// 用户-应用权限关联
type AppUserPermission struct {
    UserID       uint
    AppID        uint
    PermissionID uint
    ExpiresAt    *time.Time
}

// 用户-应用角色关联
type AppUserRole struct {
    UserID  uint
    AppID   uint
    RoleID  uint
    ExpiresAt *time.Time
}
```

### 3.2 API端点示例

```
GET    /api/v1/tenant/apps/:app_id/users/:user_id/permissions
POST   /api/v1/tenant/apps/:app_id/users/:user_id/permissions
DELETE /api/v1/tenant/apps/:app_id/users/:user_id/permissions/:permission_id
POST   /api/v1/tenant/apps/:app_id/users/:user_id/roles
DELETE /api/v1/tenant/apps/:app_id/users/:user_id/roles/:role_id
GET    /api/v1/tenant/apps/:app_id/roles
POST   /api/v1/tenant/apps/:app_id/roles
GET    /api/v1/tenant/apps/:app_id/permissions
POST   /api/v1/tenant/apps/:app_id/permissions
```

### 3.3 使用场景

- 应用内的细粒度权限控制
- 为应用用户分配特定权限
- 应用内的角色管理
- OAuth授权范围控制

---

## 四、权限系统层级关系

```
┌─────────────────────────────────────────────────────┐
│         全局/系统级权限（Admin权限）                 │
│   - BasaltPass 平台管理员                           │
│   - 跨租户管理                                      │
│   - 系统级权限：permissions 表                      │
│   - 全局角色：roles 表 (tenant_id=0)               │
│   - 路由：/api/v1/admin/*                          │
└─────────────────────────────────────────────────────┘
                         ↓ 管理
┌─────────────────────────────────────────────────────┐
│          租户级权限（Tenant权限）                    │
│   - 租户管理员（owner/admin）                       │
│   - 租户内部管理                                    │
│   - 租户角色：roles 表 (tenant_id!=0, app_id=NULL)│
│   - 租户成员：tenant_admins 表                      │
│   - 路由：/api/v1/tenant/*                         │
└─────────────────────────────────────────────────────┘
                         ↓ 管理
┌─────────────────────────────────────────────────────┐
│          应用级权限（App权限）                       │
│   - 应用管理员                                      │
│   - 应用内权限                                      │
│   - 应用角色：app_roles 表                          │
│   - 应用权限：app_permissions 表                    │
│   - 用户关联：app_user_roles, app_user_permissions │
│   - 路由：/api/v1/tenant/apps/:app_id/*            │
└─────────────────────────────────────────────────────┘
```

---

## 五、权限检查流程

### 5.1 全局管理员访问流程

```
用户请求 → JWTMiddleware（提取 userID）
         ↓
    SuperAdminMiddleware
         ↓
    检查 User.IsSuperAdmin() (role_id=1)
         ↓
    允许访问 /api/v1/admin/* 路由
```

### 5.2 租户管理员访问流程

```
用户请求 → JWTMiddleware（提取 userID）
         ↓
    RequireConsoleScope("tenant")
         ↓
    TenantMiddleware（查询 tenant_admins）
         ↓
    TenantAdminMiddleware（检查 role in [owner, admin]）
         ↓
    允许访问 /api/v1/tenant/* 路由
```

### 5.3 应用权限检查流程

```
用户请求 → JWTMiddleware
         ↓
    TenantMiddleware（验证租户关系）
         ↓
    检查 app_user_permissions 或 app_user_roles
         ↓
    计算最终权限（直接权限 + 角色权限）
         ↓
    允许/拒绝访问
```

---

## 六、关键数据库表总结

| 表名 | 用途 | 所属系统 |
|------|------|---------|
| `permissions` | 系统级权限定义 | 全局 |
| `roles` | 角色（通过tenant_id区分全局/租户/应用） | 全局/租户/应用 |
| `user_roles` | 用户-角色关联（全局角色） | 全局 |
| `role_permissions` | 角色-权限关联 | 全局 |
| `tenant_admins` | 租户管理员关联 | 租户 |
| `app_permissions` | 应用权限定义 | 应用 |
| `app_roles` | 应用角色定义 | 应用 |
| `app_user_permissions` | 用户-应用权限关联 | 应用 |
| `app_user_roles` | 用户-应用角色关联 | 应用 |
| `app_role_permissions` | 应用角色-权限关联 | 应用 |

---

## 七、前端页面对应

### 全局管理员页面
- `/admin/users` - 用户管理
- `/admin/roles` - 全局角色管理
- `/admin/permissions` - 全局权限管理
- `/admin/tenants` - 租户管理
- `/admin/subscriptions` - 订阅管理

### 租户管理员页面
- `/tenant/users` - 租户用户管理
- `/tenant/roles` - 租户角色管理
- `/tenant/apps` - 应用管理
- `/tenant/subscriptions` - 租户订阅

### 应用管理页面
- `/tenant/apps/:id/users` - 应用用户管理
- `/tenant/apps/:id/roles` - 应用角色管理
- `/tenant/apps/:id/permissions` - 应用权限管理

---

## 八、总结

BasaltPass 采用了**三层权限架构**：

1. **全局层（Admin）**：平台级管理，超级管理员
2. **租户层（Tenant）**：租户内管理，租户owner/admin
3. **应用层（App）**：应用内细粒度权限控制

这种设计非常适合 SaaS 多租户平台：
- ✅ 清晰的权限隔离
- ✅ 灵活的角色定制
- ✅ 支持多层次管理
- ✅ 细粒度的权限控制

但也存在一定复杂性：
- ⚠️ 三套权限系统需要清晰理解
- ⚠️ 权限检查逻辑较为复杂
- ⚠️ 需要注意跨层级的权限校验
- ⚠️ 数据库表关系复杂

建议：
1. 补充完整的权限文档
2. 统一命名规范（如 tenant vs admin）
3. 添加权限可视化工具
4. 增加权限审计日志
