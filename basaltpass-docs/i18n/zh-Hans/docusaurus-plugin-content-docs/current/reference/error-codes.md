---
sidebar_position: 3
---

# 错误码

BasaltPass 使用标准错误码帮助开发者调试集成问题。

| 错误码 | HTTP 状态码 | 描述 |
| :--- | :--- | :--- |
| `invalid_request` | 400 | 缺少必需参数。 |
| `invalid_client` | 401 | 客户端认证失败。 |
| `invalid_grant` | 400 | 授权码或刷新令牌无效/已过期。 |
| `unauthorized_client` | 400 | 客户端未被授权使用此授权类型。 |
| `unsupported_grant_type` | 400 | 请求的授权类型不受支持。 |
| `invalid_scope` | 400 | 请求的范围无效或超出权限。 |
| `access_denied` | 403 | 用户或服务器拒绝了请求。 |
| `server_error` | 500 | 意外的内部服务器错误。 |

## 自定义错误

某些端点可能在错误对象的 `code` 字段中返回应用特定的错误码 (例如 `user_not_found`、`password_too_weak`)。
