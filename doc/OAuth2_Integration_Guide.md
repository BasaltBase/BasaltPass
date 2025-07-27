# BasaltPass OAuth2 集成指南

BasaltPass 提供了完整的 OAuth2 授权服务器功能，允许第三方应用安全地访问用户数据。本文档将指导您如何将您的应用与 BasaltPass OAuth2 服务器集成。

## 概述

BasaltPass OAuth2 实现了标准的 Authorization Code 授权流程，支持：

- ✅ Authorization Code Grant
- ✅ Refresh Token
- ✅ PKCE (Proof Key for Code Exchange)
- ✅ OpenID Connect 用户信息
- ✅ Token 内省和撤销
- ✅ 基于 Scope 的权限控制
- ✅ 安全的客户端管理

## 快速开始

### 1. 注册 OAuth2 客户端

首先，您需要在 BasaltPass 管理后台注册您的应用：

1. 使用管理员账户登录 BasaltPass
2. 访问 **管理员 → OAuth2客户端**
3. 点击 **创建客户端**
4. 填写应用信息：
   - **应用名称**: 您的应用名称
   - **应用描述**: 应用的简短描述
   - **重定向URI**: 授权成功后的回调地址
   - **权限范围**: 应用需要的权限（openid, profile, email 等）
   - **允许的CORS源**: 前端应用的域名（可选）

5. 保存并记录 `client_id` 和 `client_secret`

### 2. 基本授权流程

#### 步骤 1: 构建授权URL

将用户重定向到以下URL进行授权：

```
GET https://your-basaltpass-domain.com/oauth/authorize?
    client_id=YOUR_CLIENT_ID&
    redirect_uri=YOUR_CALLBACK_URL&
    response_type=code&
    scope=openid profile email&
    state=random-state-string&
    code_challenge=CODE_CHALLENGE&
    code_challenge_method=S256
```

**参数说明:**
- `client_id`: 您的客户端ID
- `redirect_uri`: 授权成功后的回调URL（必须与注册时的URI匹配）
- `response_type`: 固定为 `code`
- `scope`: 请求的权限范围，用空格分隔
- `state`: 防止CSRF攻击的随机字符串
- `code_challenge`: PKCE验证码（推荐）
- `code_challenge_method`: PKCE方法，推荐使用 `S256`

#### 步骤 2: 用户授权

用户将看到授权同意页面，显示：
- 您的应用信息
- 请求的权限列表
- 授权/拒绝选项

用户同意后，会重定向到您的回调URL：

```
YOUR_CALLBACK_URL?code=AUTHORIZATION_CODE&state=YOUR_STATE
```

#### 步骤 3: 交换访问令牌

使用授权码换取访问令牌：

```http
POST https://your-basaltpass-domain.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=YOUR_CALLBACK_URL&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
code_verifier=CODE_VERIFIER
```

**响应示例:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200a1b2c3d4e5f6...",
  "scope": "openid profile email"
}
```

#### 步骤 4: 访问用户信息

使用访问令牌获取用户信息：

```http
GET https://your-basaltpass-domain.com/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN
```

**响应示例:**
```json
{
  "sub": "12345",
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true,
  "picture": "https://example.com/avatar.jpg",
  "updated_at": 1640995200
}
```

## 权限范围 (Scopes)

BasaltPass 支持以下标准权限范围：

| Scope | 描述 |
|-------|------|
| `openid` | 基本身份信息，必须包含以使用 OpenID Connect |
| `profile` | 用户基本资料（昵称、头像等） |
| `email` | 用户邮箱地址 |
| `phone` | 用户手机号码 |
| `address` | 用户地址信息 |

## 刷新令牌

当访问令牌过期时，使用刷新令牌获取新的访问令牌：

```http
POST https://your-basaltpass-domain.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=YOUR_REFRESH_TOKEN&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET
```

## PKCE 实现

为了增强安全性，强烈推荐使用 PKCE：

### 1. 生成 Code Verifier 和 Challenge

```javascript
// 生成随机的 code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 生成 code challenge
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### 2. 在授权URL中包含 Challenge

```javascript
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

const authUrl = `https://your-basaltpass-domain.com/oauth/authorize?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `scope=openid profile email&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;
```

### 3. 在令牌交换时包含 Verifier

```javascript
const tokenResponse = await fetch('https://your-basaltpass-domain.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier, // 包含 code verifier
  }),
});
```

## 令牌内省

验证访问令牌的有效性：

```http
POST https://your-basaltpass-domain.com/oauth/introspect
Content-Type: application/x-www-form-urlencoded

token=ACCESS_TOKEN
```

**响应示例:**
```json
{
  "active": true,
  "client_id": "your-client-id",
  "username": "user@example.com",
  "scope": "openid profile email",
  "exp": 1640995200,
  "iat": 1640991600,
  "sub": "12345"
}
```

## 撤销令牌

撤销访问令牌或刷新令牌：

```http
POST https://your-basaltpass-domain.com/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token=TOKEN_TO_REVOKE
```

## 错误处理

### 授权错误

当授权失败时，用户会被重定向到：

```
YOUR_CALLBACK_URL?error=ERROR_CODE&error_description=ERROR_DESCRIPTION&state=YOUR_STATE
```

**常见错误码:**
- `access_denied`: 用户拒绝授权
- `invalid_client`: 客户端无效
- `invalid_request`: 请求参数错误
- `unsupported_response_type`: 不支持的响应类型

### 令牌错误

令牌端点可能返回的错误：

```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization grant is invalid"
}
```

**常见错误码:**
- `invalid_grant`: 授权码无效或已过期
- `invalid_client`: 客户端认证失败
- `unsupported_grant_type`: 不支持的授权类型

## 最佳实践

### 安全建议

1. **使用 HTTPS**: 所有OAuth2交互都应通过HTTPS进行
2. **验证 State 参数**: 防止CSRF攻击
3. **使用 PKCE**: 特别是对于公开客户端
4. **安全存储凭证**: 客户端密钥应安全存储，不要暴露在前端代码中
5. **令牌有效期**: 合理设置访问令牌的有效期
6. **撤销令牌**: 用户登出时撤销相关令牌

### 集成建议

1. **错误处理**: 实现完善的错误处理机制
2. **用户体验**: 提供友好的授权流程
3. **缓存策略**: 合理缓存用户信息，避免频繁请求
4. **日志记录**: 记录关键的OAuth2操作用于调试

## SDK 示例

### JavaScript/TypeScript

```typescript
class BasaltPassOAuth2 {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private baseUrl: string = 'https://your-basaltpass-domain.com'
  ) {}

  // 生成授权URL
  generateAuthUrl(scopes: string[] = ['openid', 'profile', 'email'], state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state: state || this.generateState(),
    });

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  // 交换访问令牌
  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  // 获取用户信息
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/oauth/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return response.json();
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  updated_at: number;
}
```

### Python

```python
import requests
import secrets
import hashlib
import base64
from urllib.parse import urlencode, urlparse, parse_qs

class BasaltPassOAuth2:
    def __init__(self, client_id, client_secret, redirect_uri, base_url='https://your-basaltpass-domain.com'):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.base_url = base_url

    def generate_auth_url(self, scopes=['openid', 'profile', 'email'], state=None):
        """生成授权URL"""
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': ' '.join(scopes),
            'state': state or secrets.token_urlsafe(16),
        }
        
        return f"{self.base_url}/oauth/authorize?{urlencode(params)}"

    def exchange_code_for_token(self, code, code_verifier=None):
        """交换访问令牌"""
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        }
        
        if code_verifier:
            data['code_verifier'] = code_verifier

        response = requests.post(
            f"{self.base_url}/oauth/token",
            data=data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        response.raise_for_status()
        return response.json()

    def get_user_info(self, access_token):
        """获取用户信息"""
        response = requests.get(
            f"{self.base_url}/oauth/userinfo",
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        response.raise_for_status()
        return response.json()

    def refresh_token(self, refresh_token):
        """刷新访问令牌"""
        data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        }

        response = requests.post(
            f"{self.base_url}/oauth/token",
            data=data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        response.raise_for_status()
        return response.json()
```

## 测试

使用提供的测试脚本验证集成：

```bash
# Windows PowerShell
.\test_oauth2_flow.ps1

# 或手动测试关键端点
curl -X GET "https://your-basaltpass-domain.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK&response_type=code&scope=openid%20profile%20email&state=test"
```

## 故障排除

### 常见问题

1. **redirect_uri_mismatch**: 确保回调URL与注册时完全匹配
2. **invalid_client**: 检查客户端ID和密钥是否正确
3. **invalid_grant**: 授权码可能已过期或已使用
4. **scope_error**: 请求的权限范围超出了客户端配置

### 调试技巧

1. 检查浏览器开发者工具的网络标签
2. 验证所有URL参数的编码
3. 确认时间同步（令牌过期检查）
4. 查看 BasaltPass 审计日志

## 支持

如果您在集成过程中遇到问题：

1. 查看 BasaltPass 审计日志中的相关记录
2. 确认客户端配置正确
3. 检查网络连接和防火墙设置
4. 参考本文档的示例代码

---

通过以上指南，您应该能够成功将您的应用与 BasaltPass OAuth2 服务器集成。BasaltPass 提供了完整、安全、标准化的 OAuth2 实现，让您可以专注于业务逻辑的开发。 