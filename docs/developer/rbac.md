# 权限系统（RBAC）

BasaltPass 当前存在三层权限/角色语义：

1. **全局层（Admin/System）**：平台管理员、系统级 roles/permissions
2. **租户层（Tenant）**：租户内的 RBAC（tenant_rbac_*）
3. **应用层（App）**：租户内每个 App 自己的 RBAC（app_*）

## 租户 RBAC 独立表

租户 RBAC 使用独立数据表（避免与全局表混用），典型包括：
- `tenant_rbac_permissions`
- `tenant_rbac_roles`
- `tenant_user_rbac_permissions`
- `tenant_user_rbac_roles`
- `tenant_rbac_role_permissions`

## 接口入口

- 租户权限：`/api/v1/tenant/permissions`
- 租户角色：`/api/v1/tenant/roles`
- 应用权限/角色：`/api/v1/tenant/apps/:app_id/permissions`、`/api/v1/tenant/apps/:app_id/roles`

## 开发建议

- 新增权限点时，优先明确它属于哪一层（全局/租户/应用）。
- 任何涉及租户隔离的数据表查询，都必须带 tenant 条件（TenantMiddleware 提供上下文）。
