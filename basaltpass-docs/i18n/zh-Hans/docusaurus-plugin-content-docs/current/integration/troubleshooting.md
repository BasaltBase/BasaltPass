---
sidebar_position: 7
---

# 集成故障排除 (Troubleshooting)

在与 BasaltPass 集成时遇到的常见问题及其解决方法。

## 1. 重定向 URI 不匹配 (Redirect URI Mismatch)
**错误**: `invalid_grant` 或重定向失败。
**原因**: `authorize` 请求中发送的 `redirect_uri` 与控制台中注册的不完全匹配。
**解决方法**: 确保协议 (`http` vs `https`)、端口和尾随斜杠完全一致。

## 2. PKCE 验证失败
**错误**: 令牌交换期间出现 `invalid_grant`。
**原因**: 发送了 Base64Url 编码的 challenge 而不是 Hex 编码。
**解决方法**: 请参阅 [PKCE 流程实现](./pkce-flow.md) 获取正确的 Hex 编码算法。

## 3. 浏览器 CORS 错误
**错误**: 登录页面或令牌端点被 CORS 策略阻止。
**原因**: 您的前端 Origin 未被列入白名单。
**解决方法**: 将您的域名 (例如 `http://localhost:3000`) 添加到客户端配置中的 **允许的来源 (Allowed Origins)** 列表。

## 4. 无效的范围 (Invalid Scope)
**错误**: `invalid_scope`。
**原因**: 请求了客户端未被授权的 scope。
**解决方法**: 检查管理控制台中的客户端设置，确保请求的 scope 已启用。
