# BasaltPass S2S API 文档

本节定义了服务间（Service-to-Service, S2S）调用的标准化 API，面向后端服务/微服务间通信，以稳定、可机读的方式提供用户、角色/权限、钱包等数据能力，便于生成 SDK 与进行自动化集成测试。

- 版本：v1（路径前缀为 `/api/v1/s2s`）
- 协议：HTTPS + JSON
- 编码：UTF-8
- 认证：OAuth Client 凭证（client_id + client_secret）
- 鉴权：要求具备 scope：`s2s.read`

## 认证与授权

支持以下携带方式，按推荐顺序：

- Header（推荐）
  - `client_id: <your_client_id>`
  - `client_secret: <your_client_secret>`
- Form（POST 表单）
  - `client_id`、`client_secret`
- Query（仅用于内部/调试，不建议在生产暴露）
  - `?client_id=...&client_secret=...`

若凭证缺失或错误，将返回 `401 Unauthorized`，错误码 `invalid_client`。
若客户端缺少所需 scope，将返回 `403 Forbidden`，错误码 `insufficient_scope`。

## 统一响应结构

所有 S2S API 均返回统一的 envelope：

```
{
  "data": <任意对象或数组 | null>,
  "error": {
    "code": "<错误码>",
    "message": "<错误说明>"
  } | null,
  "request_id": "<可选-请求ID>"
}
```

- 成功：`data` 非空，`error` 为 `null`。
- 失败：`data` 为 `null`，`error` 包含 `code` 与 `message`。

常见错误码：
- `invalid_client`：缺少/错误的客户端凭证
- `insufficient_scope`：缺少必要的 scope
- `invalid_parameter`：参数不合法（例如 user_id 非法、缺少 currency）
- `not_found`：目标资源不存在
- `wallet_error`：钱包相关错误（如无效货币代码/余额异常）
- `server_error`：服务器内部错误

## 基础路径

```
/api/v1/s2s
```

---

## 获取用户基础信息

GET `/users/{id}`

- 描述：按用户ID返回基础的用户档案信息（去除敏感字段）
- Scope：`s2s.read`

请求示例：

```
GET /api/v1/s2s/users/123
client_id: your_client_id
client_secret: your_client_secret
```

成功响应：

```
{
  "data": {
    "id": 123,
    "email": "user@example.com",
    "nickname": "Alice",
    "avatar_url": "https://...",
    "email_verified": true,
    "phone": "+86-...",
    "phone_verified": false,
    "created_at": "2025-01-02T15:04:05Z",
    "updated_at": "2025-02-03T11:22:33Z"
  },
  "error": null,
  "request_id": "..."
}
```

可能错误：
- `invalid_parameter`（`id` 非法）
- `not_found`（用户不存在）

---

## 获取用户角色（按租户）

GET `/users/{id}/roles?tenant_id={tenant_id}`

- 描述：返回用户在指定租户下的角色列表。
- `tenant_id` 可选：若未传，默认使用当前 OAuth Client 所属租户。
- Scope：`s2s.read`

请求示例：

```
GET /api/v1/s2s/users/123/roles?tenant_id=456
client_id: your_client_id
client_secret: your_client_secret
```

成功响应：

```
{
  "data": {
    "roles": [
      { "id": 1, "code": "admin", "name": "管理员", "description": "全局管理权限" },
      { "id": 2, "code": "member", "name": "成员", "description": "普通成员" }
    ]
  },
  "error": null,
  "request_id": "..."
}
```

可能错误：
- `invalid_parameter`（`id` 或 `tenant_id` 非法）
- `server_error`（数据库异常等）

---

## 获取用户权限（通过角色派生/简化为角色代码列表）

GET `/users/{id}/permissions?tenant_id={tenant_id}`

- 描述：当前实现返回用户在指定租户下的角色代码数组（如需细粒度权限列表，可在后续版本扩展）。
- `tenant_id` 可选：未传入时默认使用当前 OAuth Client 所属租户。
- Scope：`s2s.read`

成功响应：

```
{
  "data": {
    "roles": ["admin", "member"]
  },
  "error": null,
  "request_id": "..."
}
```

可能错误：
- `invalid_parameter`
- `server_error`

---

## 获取用户钱包数据

GET `/users/{id}/wallets?currency={CODE}&limit={N}`

- 描述：返回指定货币钱包的余额与最近交易。
- 必填参数：`currency`（例如 `CNY`、`USD`）
- 可选参数：`limit`（默认 20）
- Scope：`s2s.read`

请求示例：

```
GET /api/v1/s2s/users/123/wallets?currency=CNY&limit=10
client_id: your_client_id
client_secret: your_client_secret
```

成功响应：

```
{
  "data": {
    "currency": "CNY",
    "balance": 100000,
    "wallet_id": 42,
    "transactions": [
      {
        "id": 1001,
        "wallet_id": 42,
        "type": "recharge",
        "amount": 50000,
        "status": "success",
        "reference": "mock",
        "created_at": "2025-02-03T11:22:33Z"
      }
      // ... 按时间倒序，最多 limit 条
    ]
  },
  "error": null,
  "request_id": "..."
}
```

可能错误：
- `invalid_parameter`（缺少/非法 currency）
- `wallet_error`（无效货币代码 / 钱包异常）
- `server_error`

---

## 幂等性与速率限制（建议）

- S2S 调用建议在 API 网关层配置限流与重试策略，并携带幂等键（若涉及写操作的后续扩展）。
- 本版本仅提供只读接口，后续如开放写操作，将补充 `Idempotency-Key` 要求与相应的错误码。

## 版本化与兼容

- 当前版本为 `v1`，URL 前缀固定。
- 若后续新增字段，保证向后兼容；删除或语义变更将采用新版本路径。

## SDK 生成建议

- 建议使用该文档与接口返回结构生成各语言 SDK（TypeScript/Go/Python/Java 等）。
- 认证层可封装为拦截器：统一在请求头注入 `client_id`、`client_secret`。
- 错误处理：封装统一的错误类型，包含 `code`、`message` 与 `httpStatus`。

## 变更日志

- 2025-11-04：首版发布，提供用户信息、角色/权限、钱包查询能力。
- 2025-11-04：新增消息与商品能力：
  - GET /api/v1/s2s/users/{id}/messages 支持分页与未读筛选
  - GET /api/v1/s2s/users/{id}/products 列出通过订阅或订单拥有的产品
  - GET /api/v1/s2s/users/{id}/products/{product_id}/ownership 检查是否拥有并返回来源类型
