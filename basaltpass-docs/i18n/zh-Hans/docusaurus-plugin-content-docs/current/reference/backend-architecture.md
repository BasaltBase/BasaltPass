---
sidebar_position: 2
---

# 后端架构

BasaltPass 使用 Go 构建，采用模块化架构。

## 技术栈
-   **语言**: Go
-   **Web 框架**: Fiber v2
-   **数据库**: GORM (SQLite/PostgreSQL/MySQL)

## 核心组件

### 1. 路由器
入口点位于 `internal/api/v1/router.go`。路由按领域划分：
-   `auth`: 公共认证 (登录、注册)。
-   `oauth`: OAuth2/OIDC 协议端点。
-   `user`: 终端用户受保护的个人资料 API。
-   `tenant`: 租户管理 API。
-   `admin`: 平台管理 API。

### 2. 中间件
-   **JWTMiddleware**: 验证访问令牌。
-   **TenantMiddleware**: 强制租户隔离。
-   **RateLimiter**: 防止滥用。

### 3. 服务
业务逻辑封装在服务中 (例如 `AuthService`、`UserService`)。

## 数据库迁移
BasaltPass 在启动时使用自动迁移。
-   **开发**: SQLite (`basaltpass.db`)
-   **生产**: 通过 `config.yaml` 配置 PostgreSQL/MySQL。
