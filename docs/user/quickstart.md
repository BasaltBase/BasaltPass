# 快速开始（调用第一个 API）

目标：拿到 JWT 并调用一个需要登录的接口。

## 1) 注册 / 登录

### 注册

`POST /api/v1/auth/register`

```bash
curl -sS -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 登录

`POST /api/v1/auth/login`

```bash
curl -sS -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"user@example.com","password":"password123"}'
```

成功时会返回 token（字段名以实际返回为准，通常包含 `access_token`/`refresh_token`）。

## 2) 调用用户资料

`GET /api/v1/user/profile`

```bash
curl -sS http://localhost:8080/api/v1/user/profile \
  -H 'Authorization: Bearer <access_token>'
```

## 3) 路由发现

如果你要找更多接口：
- 先看 `docs/ROUTES.md`（Method/Path 总表）
- 再看本目录下的分类文档与示例
