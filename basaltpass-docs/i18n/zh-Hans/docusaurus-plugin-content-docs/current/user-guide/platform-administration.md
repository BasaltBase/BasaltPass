---
sidebar_position: 10
---

# 平台管理

平台管理 API 用于管理整个 BasaltPass 实例。这些 API 与租户管理 API 不同。

## 认证

需要带有 `scp: admin` 的 JWT。请妥善保护此角色。

## 核心功能

### 仪表盘
查看全局统计数据和活动。
-   `GET /api/v1/admin/dashboard/stats`

### 租户管理
创建、挂起或删除租户。
-   `GET /api/v1/admin/tenants`
-   `POST /api/v1/admin/tenants`

### 用户管理
管理任何租户中的特定用户 (通常用于支持或审核)。
-   `POST /api/v1/admin/users/:id/ban`

### 系统设置
配置全局策略 (注册、允许的邮箱等)。
-   `GET /api/v1/admin/settings`

## 路由说明
一些旧版管理端点可能在 `/api/v1/tenant/` 下。建议尽可能使用 `/api/v1/admin/`。
