# S2S API（/api/v1/s2s）

S2S API 面向“服务间调用”，用于让你的业务服务稳定获取 BasaltPass 的用户/角色/钱包/订阅等数据。

## 鉴权

Header 方式（推荐）：

- `client_id: <your_client_id>`
- `client_secret: <your_client_secret>`

并检查 scope（推荐按最小权限细分；兼容旧版 `s2s.read`）。

推荐细分 scope：

- `s2s.user.read`
- `s2s.rbac.read`
- `s2s.wallet.read`
- `s2s.messages.read`
- `s2s.products.read`

兼容：历史 scope `s2s.read` 仍然可用（等同于包含所有 `s2s.*.read`）。

## 统一返回

S2S 返回使用 envelope：

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
  "error": {"code":"invalid_client","message":"..."},
  "request_id": "..."
}
```

## 端点概览

- `GET /api/v1/s2s/users/:id`
- `GET /api/v1/s2s/users/:id/roles?tenant_id=...`
- `GET /api/v1/s2s/users/:id/permissions?tenant_id=...`
- `GET /api/v1/s2s/users/:id/wallets?currency=CNY&limit=20`
- `GET /api/v1/s2s/users/:id/messages?status=unread&page=1&page_size=20`
- `GET /api/v1/s2s/users/:id/products`
- `GET /api/v1/s2s/users/:id/products/:product_id/ownership`

详细字段可参考：`docs/reference/s2s-api.md`。
