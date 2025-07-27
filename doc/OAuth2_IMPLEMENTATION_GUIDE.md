# BasaltPass OAuth2/OIDC 实现完整指南

## 概述

BasaltPass 提供了完整的 OAuth2/OIDC 身份认证服务，支持多租户、RBAC 权限控制、One-Tap Auth 和静默认证等企业级功能。

## 🏗️ 架构设计

### 核心组件

1. **租户系统** (`internal/tenant/`)
   - 多租户隔离
   - 租户级别的配额管理
   - 应用管理

2. **OAuth2 服务器** (`internal/oauth/`)
   - 标准 OAuth2/OIDC 端点
   - PKCE 支持
   - JWT 令牌管理

3. **应用管理** (`internal/app/`)
   - 租户内应用管理
   - OAuth 客户端关联

4. **JavaScript SDK** (`web/sdk/`)
   - 完整的客户端库
   - One-Tap Auth 支持
   - 自动令牌刷新

### 数据模型关系

```
Platform (平台)
├── Tenant (租户)
│   ├── App (应用)
│   │   └── OAuthClient (OAuth客户端)
│   ├── UserTenant (用户租户关系)
│   └── TenantQuota (租户配额)
└── User (用户)
    ├── OAuthToken (OAuth令牌)
    └── UserRole (用户角色)
```

## 📋 实现清单

### ✅ 已完成功能

#### 1. 核心数据模型
- [x] `Tenant`, `App`, `UserTenant` 模型
- [x] `OAuthAccessToken`, `OAuthRefreshToken`, `OAuthAuthorizationCode` 模型
- [x] 租户级别的 OAuth 客户端关联

#### 2. 服务层
- [x] 租户管理服务 (`internal/tenant/service.go`)
- [x] 应用管理服务 (`internal/app/service.go`)
- [x] OAuth 服务器核心逻辑

#### 3. HTTP 处理器
- [x] 租户管理 API (`internal/tenant/handler.go`)
- [x] 应用管理 API (`internal/app/handler.go`)
- [x] OAuth2/OIDC 端点
- [x] One-Tap Auth 端点 (`internal/oauth/onetap.go`)

#### 4. 中间件
- [x] 租户隔离中间件 (`internal/common/tenant_middleware.go`)
- [x] 超级管理员权限中间件
- [x] JWT 认证中间件

#### 5. OIDC Discovery
- [x] Discovery 端点 (`/.well-known/openid-configuration`)
- [x] JWKS 端点 (`/oauth/jwks`)
- [x] RSA 密钥生成和管理

#### 6. 路由配置
- [x] 平台管理路由 (`/_admin/*`)
- [x] 租户管理路由 (`/admin/*`)
- [x] OAuth2 服务器路由 (`/oauth/*`)
- [x] One-Tap Auth 路由

#### 7. JavaScript SDK
- [x] 完整的 TypeScript SDK (`web/sdk/basaltpass.ts`)
- [x] OAuth2 授权码流程 + PKCE
- [x] One-Tap Auth 实现
- [x] 静默认证 (Silent Auth)
- [x] 自动令牌刷新
- [x] 完整的类型定义

#### 8. 示例应用
- [x] TODO 应用示例 (`examples/todo-app/`)
- [x] One-Tap Demo (`examples/one-tap-demo/`)

### 🔄 部分完成/需要完善

#### 1. JWT 令牌验证
- ✅ RSA 密钥生成
- 🔄 完整的 JWT 验证逻辑
- 🔄 令牌撤销实现

#### 2. One-Tap Auth 会话管理
- ✅ 基础端点实现
- 🔄 完整的会话检查逻辑
- 🔄 iframe 通信优化

#### 3. 错误处理和日志
- ✅ 基础错误响应
- 🔄 详细的审计日志
- 🔄 错误监控集成

## 🚀 快速开始

### 1. 启动后端服务

```bash
cd basaltpass-backend
go run cmd/basaltpass/main.go
```

### 2. 创建租户和应用

```bash
# 创建租户
curl -X POST http://localhost:8080/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name": "我的公司",
    "domain": "mycompany.com",
    "plan": "enterprise"
  }'

# 创建应用
curl -X POST http://localhost:8080/admin/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tenant-admin-token>" \
  -d '{
    "name": "我的应用",
    "description": "示例应用",
    "callback_urls": ["http://localhost:3000/callback"]
  }'
```

### 3. 使用 JavaScript SDK

```typescript
import { initBasaltPass } from '@basaltpass/sdk';

const basaltpass = initBasaltPass({
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:3000/callback',
  scopes: ['openid', 'profile', 'email']
}, (result) => {
  if (result.success) {
    console.log('用户已登录:', result.user);
  }
});

// 常规登录
await basaltpass.login();

// One-Tap 登录（需要现有会话）
const result = await basaltpass.oneTapLogin();

// 静默认证
const silentResult = await basaltpass.silentAuth();
```

## 🔧 API 端点

### 平台管理 API (超级管理员)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/_admin/tenants` | 列出所有租户 |
| POST | `/_admin/tenants` | 创建租户 |
| GET | `/_admin/tenants/:id` | 获取租户详情 |
| PUT | `/_admin/tenants/:id` | 更新租户 |
| DELETE | `/_admin/tenants/:id` | 删除租户 |

### 租户管理 API (租户管理员)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/admin/apps` | 列出租户应用 |
| POST | `/admin/apps` | 创建应用 |
| GET | `/admin/apps/:id` | 获取应用详情 |
| PUT | `/admin/apps/:id` | 更新应用 |
| DELETE | `/admin/apps/:id` | 删除应用 |

### OAuth2/OIDC 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/.well-known/openid-configuration` | OIDC Discovery |
| GET | `/oauth/authorize` | 授权端点 |
| POST | `/oauth/token` | 令牌端点 |
| GET | `/oauth/userinfo` | 用户信息端点 |
| GET | `/oauth/jwks` | JWKS 端点 |
| POST | `/oauth/one-tap/login` | One-Tap 登录 |
| GET | `/oauth/silent-auth` | 静默认证 |

## 🔐 安全特性

### 1. 租户隔离
- 每个租户的数据完全隔离
- 基于 JWT 的租户识别
- 数据库级别的 GORM 作用域

### 2. RBAC 权限控制
- 平台级别权限（超级管理员）
- 租户级别权限（租户管理员）
- 应用级别权限（应用管理员）

### 3. OAuth2 安全
- PKCE 支持，防止授权码拦截
- 短期访问令牌 + 长期刷新令牌
- 令牌撤销机制

### 4. 密钥管理
- RSA 密钥对生成
- JWKS 端点提供公钥
- 密钥轮换支持

## 📊 配置示例

### 环境变量

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=basaltpass
DB_USER=postgres
DB_PASSWORD=password

# JWT 配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=3600

# OAuth2 配置
OAUTH_ISSUER=https://auth.yourcompany.com
OAUTH_KEY_ID=basaltpass-rsa-2024

# 服务器配置
PORT=8080
ENVIRONMENT=development
```

### 数据库迁移

```go
// 自动迁移会创建所有必要的表
func migrate(db *gorm.DB) error {
    return db.AutoMigrate(
        &model.User{},
        &model.Role{},
        &model.UserRole{},
        &model.Tenant{},
        &model.UserTenant{},
        &model.App{},
        &model.OAuthClient{},
        &model.OAuthAccessToken{},
        &model.OAuthRefreshToken{},
        &model.OAuthAuthorizationCode{},
        // ... 其他模型
    )
}
```

## 🧪 测试

### 单元测试

```bash
cd basaltpass-backend
go test ./...
```

### 集成测试

```bash
# 测试 OAuth2 流程
./test_oauth2_flow.ps1

# 测试 API 端点
./test_api.ps1
```

### 前端测试

```bash
cd web/sdk
npm test
```

## 📈 监控和日志

### 审计日志
- 所有管理操作都会记录审计日志
- 包含用户、操作、时间戳、IP 地址等信息

### 指标监控
- OAuth2 令牌颁发数量
- 认证成功/失败率
- API 响应时间

### 错误追踪
- 结构化日志记录
- 错误分类和聚合
- 告警机制

## 🔮 未来规划

### 短期目标
- [ ] 完善 JWT 验证逻辑
- [ ] 增强 One-Tap Auth 会话管理
- [ ] 添加更多测试用例

### 中期目标
- [ ] 支持 WebAuthn/Passkey
- [ ] 多因素认证 (MFA)
- [ ] 社交登录集成

### 长期目标
- [ ] 分布式部署支持
- [ ] 高可用性配置
- [ ] 性能优化

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 📞 联系我们

- 文档: https://docs.basaltpass.dev
- 问题反馈: https://github.com/basaltpass/basaltpass/issues
- 邮箱: support@basaltpass.dev

---

**BasaltPass** - 企业级身份认证解决方案 🚀
