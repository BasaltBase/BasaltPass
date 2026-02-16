# 用户/API 文档（User & API Docs）

这套文档用于：API 调用方、集成方、以及需要了解 BasaltPass 能力与端点列表的用户。

## 你可以从这里开始

- 快速开始（拿到 token 并调用一个接口）：./quickstart.md
- 第三方 App 完整接入指南（基于 CanShelf 实践）：./third-party-app-integration.md
- 鉴权与会话（JWT、console scope、租户上下文）：./auth.md
- OAuth2 / OIDC（授权码 + PKCE，userinfo 等）：./oauth2.md
- 租户控制台 API（/api/v1/tenant/...）：./tenant-admin.md
- 平台管理员 API（/api/v1/admin/...）：./admin-api.md
- S2S API（/api/v1/s2s/...，client_id/client_secret）：./s2s.md
- 端点索引（ROUTES / OpenAPI 入口）：./routes-and-openapi.md
- Curl 示例集合（复制即用）：./curl-examples.md

## 版本与兼容性

- API 前缀：`/api/v1`
- 部分管理端历史路径存在别名迁移：例如平台管理员旧前缀 `/api/v1/tenant/*` 与新前缀 `/api/v1/admin/*` 可能并存（以当前后端路由为准）。
