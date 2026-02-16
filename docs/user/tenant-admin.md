# 租户控制台 API（/api/v1/tenant）

租户控制台用于“某个租户”管理自己的资源。

## 鉴权要求

通常需要：
- JWT
- console scope 为 `tenant`
- 租户上下文（TenantMiddleware）

## 常用能力

- 租户信息
  - `GET /api/v1/tenant/info`

- 租户用户
  - `GET /api/v1/tenant/users`
  - `GET /api/v1/tenant/users/stats`
  - `POST /api/v1/tenant/users/invite`

- 租户 RBAC
  - `/api/v1/tenant/permissions/*`
  - `/api/v1/tenant/roles/*`
- 应用级 RBAC
  - `/api/v1/tenant/apps/:app_id/permissions/*`
  - `/api/v1/tenant/apps/:app_id/roles/*`
  - `/api/v1/tenant/apps/:app_id/users/:user_id/*`

- 租户通知
  - `/api/v1/tenant/notifications/*`

- 租户 OAuth 客户端
  - `/api/v1/tenant/oauth/clients/*`

- 租户订阅/商品/定价
  - `/api/v1/tenant/subscription/products/*`
  - `/api/v1/tenant/subscription/plans/*`
  - `/api/v1/tenant/subscription/prices/*`
  - `/api/v1/tenant/subscription/subscriptions/*`
  - `/api/v1/tenant/subscription/coupons/*`

端点细节请以 `docs/ROUTES.md` 为准，并结合前端对应页面调用（tenant 控制台）。

---

## RBAC 校验接口（新增）

这些接口用于直接判断“某用户是否拥有某个权限/角色”，返回键值对结果，便于业务后端直接做鉴权。

### 租户级权限校验

- `POST /api/v1/tenant/permissions/check`
- 请求体（单个或批量都可）：

```json
{
  "user_id": 123,
  "permission_code": "article.publish",
  "permission_codes": ["article.delete", "article.audit"]
}
```

- 响应体（示例）：

```json
{
  "data": {
    "user_id": 123,
    "tenant_id": 2,
    "permissions": {
      "article.publish": true,
      "article.delete": false,
      "article.audit": true
    },
    "has_all_permissions": false,
    "input_duplicate_filtered": 1
  },
  "message": "权限校验完成"
}
```

### 租户级角色校验

- `POST /api/v1/tenant/roles/check`
- 请求体（单个或批量都可）：

```json
{
  "user_id": 123,
  "role_code": "editor",
  "role_codes": ["admin", "reviewer"]
}
```

- 响应体（示例）：

```json
{
  "data": {
    "user_id": 123,
    "tenant_id": 2,
    "roles": {
      "editor": true,
      "admin": false,
      "reviewer": true
    },
    "has_all_roles": false,
    "input_duplicate_filtered": 0
  },
  "message": "角色校验完成"
}
```

### 应用级访问校验（权限 + 角色）

- `POST /api/v1/tenant/apps/:app_id/users/:user_id/check-access`
- 请求体（可只传权限、只传角色，或同时传）：

```json
{
  "permission_codes": ["article.publish", "article.delete"],
  "role_codes": ["editor", "reviewer"]
}
```

- 响应体（示例）：

```json
{
  "data": {
    "user_id": 123,
    "app_id": 11,
    "tenant_id": 2,
    "permissions": {
      "article.publish": true,
      "article.delete": false
    },
    "roles": {
      "editor": true,
      "reviewer": true
    },
    "has_all_permissions": false,
    "has_all_roles": true,
    "permission_input_dup_filtered": 0,
    "role_input_dup_filtered": 0
  },
  "message": "应用访问校验完成"
}
```

---

## RBAC 批量导入接口（新增）

支持“粘贴文本”与“上传文件”两种方式导入权限码/角色码。

### 租户级导入

- 权限码导入：`POST /api/v1/tenant/permissions/import`
- 角色码导入：`POST /api/v1/tenant/roles/import`

### 应用级导入

- 权限码导入：`POST /api/v1/tenant/apps/:app_id/permissions/import`
- 角色码导入：`POST /api/v1/tenant/apps/:app_id/roles/import`

### 请求格式

#### 1) JSON 请求

- 通用字段：
  - `content`：文本内容（按换行/空格/逗号/分号切分）
  - `codes` 或 `items`：字符串数组（可替代 `content`）
- 权限导入可附加：
  - `category`：分类（默认 `imported`）

```json
{
  "category": "content",
  "codes": ["Article.Publish", "article.publish", "article.delete"]
}
```

#### 2) multipart/form-data 请求

- `file`：文本文件（可选）
- `content`：文本输入（可选）
- `category`：权限导入时可选

### 导入规则

- 自动去除空值
- 自动统一为小写（例如 `Article.Publish` -> `article.publish`）
- 输入内重复自动去重
- 与数据库已有记录重复时自动跳过，不报错
- 响应中返回：
  - `created_count`
  - `existing_count`
  - `input_duplicate_filtered`
  - `created_codes`
  - `existing_codes`
