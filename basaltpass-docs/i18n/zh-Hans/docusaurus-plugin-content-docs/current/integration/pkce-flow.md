---
sidebar_position: 4
---

# PKCE 授权流程

PKCE (Proof Key for Code Exchange) 对于公共客户端 (SPA, 移动应用) 是 **强制性** 的，并且推荐所有客户端使用，以防止授权码拦截攻击。

## 工作原理

1.  **客户端** 创建一个高熵的加密随机字符串，称为 `code_verifier`。
2.  **客户端** 从 `code_verifier` 计算出 `code_challenge`。
3.  **客户端** 在授权请求中通过 `code_challenge` 发送给 BasaltPass。
4.  **BasaltPass** 存储 `code_challenge`。
5.  **BasaltPass** 返回 `authorization_code`。
6.  **客户端** 将 `authorization_code` 和原始的 `code_verifier` 发送到令牌端点。
7.  **BasaltPass** 验证 `TRANSFORM(code_verifier) == code_challenge`。

## 实现细节 (关键)

BasaltPass 对 `code_challenge` 的计算有特定要求。

### 要求
-   **算法**: SHA-256 (`S256`)
-   **编码**: **十六进制 (Hexadecimal)** (小写) 字符串。

> **警告**: 不要在 SHA-256 哈希后使用 Base64Url 编码。请使用 **Hex** 编码。

### 代码示例

#### JavaScript / TypeScript

```javascript
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // 转换为 Hex 字符串
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}
```
