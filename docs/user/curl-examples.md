# Curl 示例集合

> 说明：以下示例以开发环境 `http://localhost:8080` 为 base URL。

## Health

```bash
curl -i http://localhost:8080/health
curl -i http://localhost:8080/api/v1/health
```

## 登录与刷新

```bash
curl -sS -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"user@example.com","password":"password123"}'

curl -sS -X POST http://localhost:8080/api/v1/auth/refresh \
  -H 'Authorization: Bearer <refresh_or_access_token>'
```

## 用户资料

```bash
curl -sS http://localhost:8080/api/v1/user/profile \
  -H 'Authorization: Bearer <access_token>'
```

## S2S：获取用户

```bash
curl -sS http://localhost:8080/api/v1/s2s/users/123 \
  -H 'client_id: <client_id>' \
  -H 'client_secret: <client_secret>'
```
