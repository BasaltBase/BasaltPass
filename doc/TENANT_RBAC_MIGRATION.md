# 租户权限系统独立迁移总结

## 变更概述

成功将租户的 Role 和 Permission 系统从共享表独立到单独的表中，按照 App 权限系统的命名规范进行命名。

## 新增的模型和表

### 1. 租户权限模型
- **模型文件**: `internal/model/tenant_rbac_permission.go`
- **表名**: 
  - `tenant_rbac_permissions` - 租户权限定义
  - `tenant_user_rbac_permissions` - 用户-租户权限关联
  - `tenant_rbac_role_permissions` - 租户角色-权限关联

**模型定义**:
```go
type TenantRbacPermission struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    Code        string    `json:"code" gorm:"uniqueIndex:idx_tenant_permission_code;size:100;not null"`
    Name        string    `json:"name" gorm:"size:100;not null"`
    Description string    `json:"description" gorm:"size:500"`
    Category    string    `json:"category" gorm:"size:50;not null"`
    TenantID    uint      `json:"tenant_id" gorm:"uniqueIndex:idx_tenant_permission_code;not null;index"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type TenantUserRbacPermission struct {
    ID           uint       `json:"id" gorm:"primaryKey"`
    UserID       uint       `json:"user_id" gorm:"not null;index"`
    TenantID     uint       `json:"tenant_id" gorm:"not null;index"`
    PermissionID uint       `json:"permission_id" gorm:"not null"`
    GrantedAt    time.Time  `json:"granted_at"`
    GrantedBy    uint       `json:"granted_by" gorm:"not null"`
    ExpiresAt    *time.Time `json:"expires_at,omitempty"`
}

type TenantRbacRolePermission struct {
    RoleID       uint `gorm:"primaryKey"`
    PermissionID uint `gorm:"primaryKey"`
}
```

### 2. 租户角色模型
- **模型文件**: `internal/model/tenant_rbac_role.go`
- **表名**:
  - `tenant_rbac_roles` - 租户角色定义
  - `tenant_user_rbac_roles` - 用户-租户角色关联

**模型定义**:
```go
type TenantRbacRole struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    Code        string    `json:"code" gorm:"uniqueIndex:idx_tenant_role_code;size:100;not null"`
    Name        string    `json:"name" gorm:"size:100;not null"`
    Description string    `json:"description" gorm:"size:500"`
    TenantID    uint      `json:"tenant_id" gorm:"uniqueIndex:idx_tenant_role_code;not null;index"`
    IsSystem    bool      `json:"is_system" gorm:"default:false"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type TenantUserRbacRole struct {
    ID         uint       `json:"id" gorm:"primaryKey"`
    UserID     uint       `json:"user_id" gorm:"not null;index"`
    TenantID   uint       `json:"tenant_id" gorm:"not null;index"`
    RoleID     uint       `json:"role_id" gorm:"not null"`
    AssignedAt time.Time  `json:"assigned_at"`
    AssignedBy uint       `json:"assigned_by" gorm:"not null"`
    ExpiresAt  *time.Time `json:"expires_at,omitempty"`
}
```

## 修改的模型

### 1. Role 模型 (`internal/model/role.go`)
**变更**: 移除了 TenantID 和 AppID 字段，现在仅用于全局/系统级角色

```go
// 修改前
type Role struct {
    gorm.Model
    TenantID    uint   `gorm:"not null;index"`
    AppID       *uint  `gorm:"index"`
    Code        string
    Name        string
    Description string
    IsSystem    bool
}

// 修改后
type Role struct {
    gorm.Model
    Code        string `gorm:"size:64;not null;uniqueIndex"`
    Name        string `gorm:"size:100;not null"`
    Description string `gorm:"size:500"`
    IsSystem    bool   `gorm:"default:false"`
}
```

### 2. Permission 模型 (`internal/model/permission.go`)
**变更**: 添加注释说明其仅用于全局权限

```go
// Permission represents a global/system permission code
// 全局权限：用于系统级管理员权限管理
// 不再用于租户级或应用级权限（这些已有独立的 TenantRbacPermission 和 AppPermission）
type Permission struct {
    gorm.Model
    Code string `gorm:"uniqueIndex;size:64"`
    Desc string `gorm:"size:255"`
}
```

## 修改的代码文件

### Handler
- `internal/handler/tenant/role_handler.go`
  - 所有 `model.Role` → `model.TenantRbacRole`
  - 所有 `model.UserRole` → `model.TenantUserRbacRole`
  - 所有 `model.RolePermission` → `model.TenantRbacRolePermission`
  - 移除 AppID 相关逻辑（租户角色不再关联应用）

### Service
- `internal/service/tenant/tenant_service.go`
  - `createDefaultRoles()` 函数使用 `TenantRbacRole`
  
- `internal/service/auth/service.go`
  - `setupFirstUserAsGlobalAdmin()` 函数使用 `TenantRbacRole` 和 `TenantUserRbacRole`
  - 添加 `time` 包导入

### Migration
- `internal/migration/migrate.go`
  - 在 `AutoMigrate` 中添加新模型
  - `createDefaultRoles()` 使用 `TenantRbacRole`
  - `createAdditionalSystemRoles()` 使用 `TenantRbacRole`

## 命名规范

为避免与现有的 `TenantRole`（表示 owner/admin/member 的枚举类型）冲突，使用了以下命名：

- **租户RBAC角色**: `TenantRbacRole` (表: `tenant_rbac_roles`)
- **租户RBAC权限**: `TenantRbacPermission` (表: `tenant_rbac_permissions`)
- **用户-租户角色关联**: `TenantUserRbacRole` (表: `tenant_user_rbac_roles`)
- **用户-租户权限关联**: `TenantUserRbacPermission` (表: `tenant_user_rbac_permissions`)
- **租户角色-权限关联**: `TenantRbacRolePermission` (表: `tenant_rbac_role_permissions`)

这与 App 权限系统的命名保持一致：
- `AppRole` / `app_roles`
- `AppPermission` / `app_permissions`
- `AppUserRole` / `app_user_roles`
- `AppUserPermission` / `app_user_permissions`

## 权限系统层级（更新后）

```
全局层（Admin）
├── permissions 表 - 全局权限
├── roles 表 - 全局角色（不含 tenant_id）
└── user_roles 表 - 用户-全局角色关联

租户层（Tenant）
├── tenant_rbac_permissions 表 - 租户权限
├── tenant_rbac_roles 表 - 租户角色
├── tenant_user_rbac_permissions 表 - 用户-租户权限
├── tenant_user_rbac_roles 表 - 用户-租户角色
└── tenant_rbac_role_permissions 表 - 租户角色-权限

应用层（App）
├── app_permissions 表 - 应用权限
├── app_roles 表 - 应用角色
├── app_user_permissions 表 - 用户-应用权限
└── app_user_roles 表 - 用户-应用角色
```

## 数据迁移注意事项

⚠️ **重要**: 此次变更涉及数据库结构重大变化，需要进行数据迁移：

1. **旧数据**: 原 `roles` 表中 `tenant_id != 0` 的记录需要迁移到 `tenant_rbac_roles`
2. **关联数据**: `user_roles` 表中关联租户角色的记录需要迁移到 `tenant_user_rbac_roles`
3. **权限数据**: 如有租户级权限数据，需要迁移到新的权限表

### 建议的迁移步骤

1. 备份数据库
2. 运行自动迁移创建新表
3. 编写数据迁移脚本将旧数据迁移到新表
4. 验证数据完整性
5. 清理旧表中的租户数据（可选）

## 测试建议

1. ✅ 编译测试 - 已通过
2. 🔲 单元测试 - 需要运行测试
3. 🔲 集成测试 - 验证租户角色管理功能
4. 🔲 API测试 - 测试租户角色相关的 API 端点
5. 🔲 前端集成 - 确保前端调用正常

## 后续工作

1. 编写数据迁移脚本
2. 更新API文档
3. 更新前端代码（如果有直接引用）
4. 添加单元测试
5. 更新系统架构文档
