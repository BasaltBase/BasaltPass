---
sidebar_position: 4
---

# 数据模型

理解数据关系有助于设计您的集成方案。

## 核心实体

### 用户 (User)
核心身份。用户属于某个租户，但可以有关联账户 (社交登录)。
-   **字段**: `id`、`email`、`password_hash`、`tenant_id`、`created_at`。

### 角色与权限 (Role & Permission)
-   **角色**: 权限的分组。
-   **权限**: 特定的操作代码。
-   **关系**: 用户和角色之间是多对多关系。

### OAuth 客户端 (Client)
代表请求访问的应用程序。
-   **字段**: `client_id`、`client_secret`、`redirect_uris`、`allowed_origins`。

### 刷新令牌 (Refresh Token)
用于获取新访问令牌的长期有效令牌。
-   **字段**: `token_hash`、`user_id`、`client_id`、`expires_at`。
