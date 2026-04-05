# BasaltPass S2S Python SDK (alpha)

一个最小可用的 Python SDK，用于访问 BasaltPass 的 S2S API（/api/v1/s2s）。

完整接口参考见：

- `../../basaltpass-docs/docs/reference/s2s-api.md`

## 安装

```bash
pip install requests
```

## 使用示例

```python
from basaltpass_s2s import BasaltPassS2SClient

client = BasaltPassS2SClient(
    base_url="http://localhost:8101",
    client_id="your_client_id",
    client_secret="your_client_secret",
)

# 获取用户信息
user = client.get_user(123)
print(user)

# 获取角色（按租户）
roles = client.get_user_roles(123, tenant_id=456)
print(roles)

# 获取角色代码（简化权限）
role_codes = client.get_user_role_codes(123, tenant_id=456)
print(role_codes)

# 获取钱包
wallet = client.get_user_wallet(123, currency="CNY", limit=10)
print(wallet)

# 调整余额（amount 为最小货币单位）
adjusted = client.adjust_user_wallet(
    123,
    operation="decrease",
    amount=299,
    currency="CNY",
    reference="billing:order_1001",
)
print(adjusted)

client.close()
```

## 当前 SDK 已封装的接口

- `GET /api/v1/s2s/users/{id}`
- `GET /api/v1/s2s/users/{id}/roles`
- `GET /api/v1/s2s/users/{id}/permissions`
- `GET /api/v1/s2s/users/{id}/wallets`
- `POST /api/v1/s2s/users/{id}/wallets/adjust`
- `GET /api/v1/s2s/users/{id}/messages`
- `GET /api/v1/s2s/users/{id}/products`
- `GET /api/v1/s2s/users/{id}/products/{product_id}/ownership`

## 后端已支持但 SDK 尚未封装的接口

- `GET /api/v1/s2s/health`
- `GET /api/v1/s2s/me`
- `GET /api/v1/s2s/users/lookup`
- `PATCH /api/v1/s2s/users/{id}`
- `GET /api/v1/s2s/users/{id}/role-codes`
- `GET /api/v1/s2s/teams`
- `POST /api/v1/s2s/teams`
- `GET /api/v1/s2s/teams/{id}`
- `GET /api/v1/s2s/users/{id}/teams`
- `POST /api/v1/s2s/notifications`
- `POST /api/v1/s2s/emails/send`

## 错误处理

当返回的 envelope 含有 `error` 字段时，SDK 会抛出 `RuntimeError`，信息包含 `code` 与 `message`。你可以按需封装更细的异常类型。
