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
- 租户用户权限校验：`POST /api/v1/tenant/permissions/check`
- 租户用户角色校验：`POST /api/v1/tenant/roles/check`
- 应用用户访问校验（权限+角色）：`POST /api/v1/tenant/apps/:app_id/users/:user_id/check-access`
- 租户批量导入：
  - `POST /api/v1/tenant/permissions/import`
  - `POST /api/v1/tenant/roles/import`
- 应用批量导入：
  - `POST /api/v1/tenant/apps/:app_id/permissions/import`
  - `POST /api/v1/tenant/apps/:app_id/roles/import`

## 校验接口说明

为避免接入方重复拼装复杂 SQL，提供“用户 + 码列表 -> bool 映射”的校验接口。

- 入参支持单个字段与批量字段：
  - 权限：`permission_code` / `permission_codes`
  - 角色：`role_code` / `role_codes`
- 返回值包含：
  - `permissions` 或 `roles`（`code -> bool`）
  - `has_all_permissions` / `has_all_roles`
- 权限校验包含：
  - 用户直接授予权限
  - 通过角色派生的权限
  - 并考虑过期时间（`expires_at`）

## 批量导入规范

导入接口支持 JSON 与 multipart/form-data：

- JSON：`content`（文本）或 `codes/items`（数组）
- multipart/form-data：`file` 或 `content`（权限导入可选 `category`）

导入处理规则：

- 大小写统一：全部规范化为小写
- 自动去重：输入内重复项去重
- 幂等友好：数据库已有码自动跳过
- 返回统计：
  - `created_count`
  - `existing_count`
  - `input_duplicate_filtered`
  - `created_codes`
  - `existing_codes`

## 开发建议

- 新增权限点时，优先明确它属于哪一层（全局/租户/应用）。
- 任何涉及租户隔离的数据表查询，都必须带 tenant 条件（TenantMiddleware 提供上下文）。
