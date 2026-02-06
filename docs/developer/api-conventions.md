# API 约定与返回格式

BasaltPass 当前处于快速演进期：不同模块的返回结构存在一定差异。
本文档用于帮助开发者与集成方理解“当前行为”，并给出推荐用法。

## Base URL

默认开发环境：`http://localhost:8080`
API 前缀：`/api/v1`

## 鉴权方式概览

- 用户/租户/管理员接口：通常使用 JWT
  - Header：`Authorization: Bearer <access_token>`
- S2S 接口：使用 `client_id` + `client_secret`（并检查 scope，例如 `s2s.read`）

## JWT Claims（关键字段）

后端生成的 JWT access token 里包含：

- `sub`：user id
- `tid`：tenant id（非 admin scope 时会尝试推导默认租户）
- `scp`：console scope（`user`/`tenant`/`admin`）
- `exp`：过期时间

## 请求 ID

全局中间件会为请求生成 request id（Fiber requestid）。
- 在某些 envelope（例如 S2S）里会返回 `request_id` 字段。

## 错误返回（全局 ErrorHandler）

Fiber 全局 ErrorHandler 兜底会返回：

```json
{
  "error": "...",
  "code": 400,
  "path": "/api/v1/...",
  "request": "..."
}
```

但很多 handler 也会自行返回 `fiber.Map{"error": ...}` 或 `{"data":...,"message":...}`。
集成方建议：
1. **优先检查 HTTP Status**
2. 再从 body 中兼容读取 `error` / `message` / `code`

## S2S Envelope（推荐/较一致）

S2S handler 统一封装：

```json
{
  "data": { },
  "error": null,
  "request_id": "..."
}
```

错误时：

```json
{
  "data": null,
  "error": {"code": "invalid_parameter", "message": "..."},
  "request_id": "..."
}
```

## 路由总表与 OpenAPI

- `docs/ROUTES.md`：从后端路由树导出，最完整（但仅是 Method/Path 列表）。
- `docs/reference/openapi.yaml`：OpenAPI 草案，可能不覆盖所有端点/字段。

建议：接口发现以 `docs/ROUTES.md` 为准；接口细节以对应 handler 实现和本文档的用户/API 文档为准。
