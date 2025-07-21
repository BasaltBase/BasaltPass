这个项目是一个面向B端和C端SaaS化、平台化的「用户账户与钱包中心」，能作为**所有业务项目的单点认证和账户系统**（SSO/Identity Hub），未来可以发展成模块化的账户基础设施。

---

# 一. 项目命名

BasaltPass

# 二. 敏捷开发一周提纲

## **【Day 1：基础架构与环境搭建】** ✅ 已完成

* ✅ 初始化go fiber（最新版本） +sqlite 项目，ORM选型（GORM）
* ✅ 完成数据库表结构设计（用户、角色、认证、钱包、操作日志等）
* ✅ 配置Go Fiber的基础中间件（日志、CORS、安全头）
* ✅ React + Tailwind + Vite 前端脚手架初始化（最新版本）
* ✅ 设计项目目录结构，接口风格（RESTful/OpenAPI）

### 已完成的具体内容：
- **后端架构**：Go Fiber v2.52.0 + GORM + SQLite
- **前端架构**：React + Vite + Tailwind CSS + TypeScript
- **数据库模型**：用户、角色、权限、钱包、审计日志、OAuth账户等
- **项目结构**：按领域分层的模块化设计
- **依赖管理**：修复了oauth2依赖问题，添加了必要的Go模块

## **【Day 2：用户注册、登录、JWT认证】** ✅ 已完成

* ✅ 实现邮箱/手机号注册、登录、验证码（mock）
* ✅ JWT生成与校验中间件，refresh token机制
* ✅ 实现用户基础资料（头像、昵称、邮箱、手机号）
* ✅ 开发前端登录注册页面、基础Profile页

### 已完成的具体内容：
- **认证系统**：JWT token生成与验证中间件
- **用户模型**：完整的用户信息管理
- **前端页面**：登录、注册、个人资料页面
- **API接口**：用户认证相关的RESTful接口

## **【Day 3：OAuth2/三方登录支持】** ✅ 已完成

* ✅ 对接Google、Meta、Microsoft OAuth2，抽象Provider结构
* ✅ OAuth2登录、绑定/解绑流程（新老账户合并）
* ✅ UI实现三方登录按钮及回调处理

### 已完成的具体内容：
- **OAuth Provider抽象**：支持Google、Meta、Microsoft
- **OAuth处理流程**：登录、绑定、解绑
- **前端集成**：OAuth登录按钮和回调处理
- **依赖修复**：解决了golang.org/x/oauth2导入问题

## **【Day 4：用户安全与账户管理】** ✅ 已完成

* ✅ 密码重置、二次验证（TOTP、短信/邮箱二步验证）
* ✅ 密保问题、手机号更换、注销、风控审计表
* ✅ 用户角色和权限（RBAC模型，基础角色维护页面）
* ✅ 前端控制台完善（账号安全设置、二次验证管理）

### 已完成的具体内容：
- **安全模块**：2FA双因素认证、密码重置
- **RBAC系统**：角色和权限模型已实现
- **审计日志**：操作日志记录功能已实现
- **前端页面**：安全设置、2FA管理页面

## **【Day 5：多币种钱包系统】** ✅ 已完成

* ✅ 钱包账户模型（支持多币种：USD, CNY, BTC, ETH等， 用户可以添加自定义币种，方便未来扩展）
* ✅ 钱包充值、提现、余额查询（mock接口或对接测试网）
* ✅ 交易记录、充值/提现审批流
* ✅ 钱包UI组件开发（余额、充值、提现、历史）

### 已完成的具体内容：
- **钱包模型**：多币种钱包数据结构已实现
- **钱包服务**：完整的钱包操作逻辑
- **前端页面**：钱包管理、充值提现、交易历史页面
- **管理功能**：钱包审批流程

## **【Day 6：团队功能系统】** ✅ 已完成

* ✅ 团队模型设计（Team、TeamMember）
* ✅ 团队角色权限（所有者、管理员、普通成员）
* ✅ 团队管理功能（创建、编辑、删除、成员管理）
* ✅ 前端团队管理页面（团队列表、详情、成员管理）

### 已完成的具体内容：
- **团队模型**：Team、TeamMember、TeamRole
- **权限系统**：基于角色的团队权限控制
- **API接口**：完整的团队管理RESTful API
- **前端页面**：团队列表、创建、详情、成员管理页面
- **数据库设计**：支持团队钱包扩展

## **【Day 7：管理后台、系统UI完善】** 📋 待开始

* 📋 用户列表、搜索、权限分配
* 📋 钱包流水、交易管理
* 📋 日志审计页面、异常处理、全局通知
* 📋 响应式UI自适应优化、深色模式

---

## 2.2. AI Agent助力开发建议

* 需求拆解与用户故事梳理（AI出user story，自动生成issue）
* 代码生成（如：JWT实现、第三方登录对接、gorm模型自动生成、react表单组件生成、tailwind样式建议）
* 测试用例自动生成（api接口、前端表单验证）
* 技术选型与架构设计评审（AI辅助）
* 文档生成与API自动注释

## 2.3. 后续可拓展功能建议

* 用户行为分析与风控
* 消息推送、邮件服务
* 多团队/组织账户
* 钱包上链/数字资产管理
* 多语言支持

# 三. 架构设计

## 3.1. 数据库设计

### 已实现的数据库模型：

```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    nickname VARCHAR(50),
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户角色关联表
CREATE TABLE user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 团队表
CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 团队成员表
CREATE TABLE team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    joined_at BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 钱包表（支持用户和团队钱包）
CREATE TABLE wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    team_id INTEGER,
    currency VARCHAR(16) NOT NULL,
    balance BIGINT DEFAULT 0,
    freeze BIGINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- 钱包交易记录表
CREATE TABLE wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(32) DEFAULT 'pending',
    reference VARCHAR(128),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

-- OAuth账户表
CREATE TABLE oauth_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(100) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 审计日志表
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 密码重置表
CREATE TABLE password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 3.2. 技术栈确认

### 后端技术栈：
- **框架**：Go Fiber v2.52.0
- **ORM**：GORM v1.25.5
- **数据库**：SQLite（开发环境）
- **认证**：JWT (golang-jwt/jwt/v5)
- **OAuth2**：golang.org/x/oauth2 v0.17.0
- **加密**：golang.org/x/crypto v0.18.0
- **2FA**：github.com/pquerna/otp v1.4.0

### 前端技术栈：
- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **路由**：React Router
- **状态管理**：React Hooks
- **HTTP客户端**：Axios

## 3.3. 项目结构（实际实现）

### 后端目录结构：
```
/basaltpass-backend
├── cmd/basaltpass/main.go          # 应用入口
├── internal/
│   ├── api/router.go               # 路由配置
│   ├── auth/                       # 认证模块
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── jwt.go
│   │   ├── password_reset.go
│   │   └── dto.go
│   ├── user/                       # 用户模块
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── dto.go
│   ├── team/                       # 团队模块
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── dto.go
│   ├── wallet/                     # 钱包模块
│   │   ├── handler.go
│   │   └── service.go
│   ├── oauth/                      # OAuth模块
│   │   ├── handler.go
│   │   ├── provider.go
│   │   └── google.go
│   ├── security/                   # 安全模块
│   │   └── handler.go
│   ├── rbac/                       # 权限模块
│   │   ├── handler.go
│   │   └── service.go
│   ├── admin/                      # 管理模块
│   │   ├── handler.go
│   │   ├── audit_handler.go
│   │   └── wallet_handler.go
│   ├── model/                      # 数据模型
│   │   ├── user.go
│   │   ├── role.go
│   │   ├── team.go
│   │   ├── wallet.go
│   │   ├── oauth_account.go
│   │   ├── audit_log.go
│   │   └── password_reset.go
│   └── common/                     # 公共模块
│       ├── database.go
│       ├── middleware.go
│       ├── jwt_middleware.go
│       ├── admin_middleware.go
│       └── migrate.go
├── docs/openapi.yaml              # API文档
├── go.mod                         # Go模块文件
└── basaltpass.db                 # SQLite数据库
```

### 前端目录结构：
```
/basaltpass-frontend
├── src/
│   ├── pages/                     # 页面组件
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── OauthSuccess.tsx
│   │   ├── profile/
│   │   │   └── Index.tsx
│   │   ├── team/                  # 团队页面
│   │   │   ├── Index.tsx
│   │   │   ├── Create.tsx
│   │   │   └── Detail.tsx
│   │   ├── wallet/
│   │   │   ├── Index.tsx
│   │   │   ├── Recharge.tsx
│   │   │   ├── Withdraw.tsx
│   │   │   └── History.tsx
│   │   ├── security/
│   │   │   └── TwoFA.tsx
│   │   └── admin/
│   │       ├── Users.tsx
│   │       ├── Wallets.tsx
│   │       ├── Roles.tsx
│   │       └── Logs.tsx
│   ├── api/                       # API接口
│   │   ├── client.ts
│   │   ├── admin.ts
│   │   ├── team.ts
│   │   ├── security.ts
│   │   └── wallet.ts
│   ├── utils/
│   │   └── auth.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── router.tsx
├── package.json
└── vite.config.ts
```

## 3.4. API接口设计（已实现）

### 认证接口：
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `POST /api/v1/auth/refresh` - 刷新Token
- `POST /api/v1/auth/oauth/{provider}/login` - OAuth登录
- `POST /api/v1/auth/oauth/{provider}/bind` - OAuth绑定

### 用户接口：
- `GET /api/v1/user/profile` - 获取用户资料
- `PUT /api/v1/user/profile` - 更新用户资料
- `POST /api/v1/user/avatar` - 上传头像

### 团队接口：
- `POST /api/v1/teams` - 创建团队
- `GET /api/v1/teams` - 获取用户的所有团队
- `GET /api/v1/teams/{id}` - 获取团队详情
- `PUT /api/v1/teams/{id}` - 更新团队信息
- `DELETE /api/v1/teams/{id}` - 删除团队
- `GET /api/v1/teams/{id}/members` - 获取团队成员列表
- `POST /api/v1/teams/{id}/members` - 添加团队成员
- `PUT /api/v1/teams/{id}/members/{member_id}` - 更新成员角色
- `DELETE /api/v1/teams/{id}/members/{member_id}` - 移除团队成员
- `POST /api/v1/teams/{id}/leave` - 离开团队

### 钱包接口：
- `GET /api/v1/wallet/balance` - 获取钱包余额
- `POST /api/v1/wallet/recharge` - 钱包充值
- `POST /api/v1/wallet/withdraw` - 钱包提现
- `GET /api/v1/wallet/history` - 交易历史

### 安全接口：
- `POST /api/v1/security/2fa/setup` - 设置2FA
- `POST /api/v1/security/2fa/verify` - 验证2FA
- `POST /api/v1/security/password/reset` - 重置密码

### 管理接口：
- `GET /api/v1/admin/users` - 用户列表
- `GET /api/v1/admin/wallets` - 钱包管理
- `GET /api/v1/admin/logs` - 审计日志
- `GET /api/v1/admin/roles` - 角色管理

## 3.5. 团队功能设计

### 团队角色权限：
1. **所有者 (Owner)**：
   - 可以修改团队信息
   - 可以管理所有成员
   - 可以删除团队
   - 不能离开团队（必须先转让所有权）

2. **管理员 (Admin)**：
   - 可以修改团队信息
   - 可以管理成员（添加、移除、修改角色）
   - 不能删除团队
   - 可以离开团队

3. **普通成员 (Member)**：
   - 可以查看团队信息
   - 可以查看成员列表
   - 不能管理团队
   - 可以离开团队

### 团队功能特性：
- **多对多关系**：一个用户可以加入多个团队，一个团队可以有多个用户
- **角色继承**：管理员继承普通成员的所有权限
- **权限验证**：所有操作都会验证用户在该团队中的角色权限
- **团队钱包**：支持为团队创建独立的钱包账户
- **审计日志**：记录所有团队相关的操作

## 3.6. 安全策略实现

### 已实现的安全措施：
1. **JWT认证**：Access Token + Refresh Token机制
2. **密码安全**：bcrypt加密存储
3. **OAuth2集成**：支持Google、Meta、Microsoft
4. **中间件保护**：JWT验证、管理员权限验证
5. **审计日志**：敏感操作记录
6. **CORS配置**：跨域请求控制
7. **团队权限**：基于角色的团队权限控制

### 待实现的安全措施：
1. **Rate Limiting**：API访问频率限制
2. **CSRF防护**：跨站请求伪造防护
3. **输入验证**：更严格的数据验证

## 3.7. 部署配置

### Docker配置：
- `backend.Dockerfile` - 后端服务容器化
- `frontend.Dockerfile` - 前端应用容器化
- `docker-compose.yml` - 服务编排配置

### 环境变量配置：
```bash
# 数据库配置
DB_TYPE=sqlite
DB_PATH=basaltpass.db

# JWT配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRE_HOURS=24

# OAuth配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3000/auth/oauth/google/callback
```

---

## 四、开发进度总结

### 已完成功能（Day 1-6）：
1. ✅ **基础架构搭建**：Go Fiber + React + SQLite
2. ✅ **用户认证系统**：注册、登录、JWT认证、2FA、密码重置、WebAuthn/Passkey
3. ✅ **OAuth2集成**：Google、Meta、Microsoft三方登录
4. ✅ **数据库设计**：完整的用户、团队、钱包、权限、通知、邀请、审计日志等模型
5. ✅ **前端基础页面**：登录、注册、个人资料、团队管理、钱包、通知中心、安全设置
6. ✅ **API接口**：用户、团队、钱包、通知、邀请、用户搜索等RESTful API
7. ✅ **团队功能**：完整的团队管理系统（创建、编辑、成员管理、邀请、角色权限）
8. ✅ **钱包系统**：多币种钱包、充值提现、交易历史、审批流
9. ✅ **安全功能**：2FA、密码重置、账户安全、WebAuthn/Passkey
10. ✅ **通知系统**：
    - 用户可接收系统通知、团队相关通知、邀请通知，支持全员广播和定向推送
    - 前端实现通知中心页面，支持已读/未读、批量标记、删除等操作
    - 管理员可通过后台发送系统通知，管理所有通知
11. ✅ **邀请系统**：
    - 支持团队成员邀请、接受/拒绝/撤回邀请，自动推送相关通知
    - 前端实现邀请收件箱页面，支持分页、操作反馈
12. ✅ **用户搜索**：
    - 支持昵称/邮箱模糊搜索，接口支持分页，前端集成搜索框
13. ✅ **管理后台（部分）**：
    - 用户管理：用户列表、搜索、禁用/解禁
    - 钱包管理：用户钱包列表、余额查看
    - 通知管理：系统通知的创建、删除、列表
    - 角色分配：基础角色分配接口
    - 审计日志：操作日志查询接口

### 当前进行中（Day 7）：
1. 🔄 **管理后台**：用户管理、钱包管理、通知管理、角色分配、审计日志页面（部分已实现，部分功能完善中）
2. 🔄 **系统优化**：性能优化、UI完善、响应式设计、深色模式

### 待开发功能：
1. 📋 **测试部署**：单元测试、集成测试、Docker部署
2. 📋 **文档完善**：API文档、部署文档、用户手册
3. 📋 **安全加固**：更完善的输入验证、错误处理、Rate Limiting、CSRF防护
4. 📋 **系统监控与告警**：监控、异常告警机制

## 技术债务与优化点：
1. **测试覆盖**：需要添加单元测试和集成测试
2. **文档完善**：API文档、部署文档、用户手册
3. **性能优化**：数据库查询优化、缓存策略
4. **安全加固**：更完善的输入验证、错误处理
5. **监控告警**：系统监控、异常告警机制

---

# 五、下一步开发计划

## 短期目标（本周内）：
1. 完成管理后台基础功能
2. 添加基础测试用例
3. 完善API文档

## 中期目标（下个月）：
1. 优化UI/UX设计
2. 添加更多OAuth提供商
3. 实现消息通知系统
4. 完善团队钱包功能

## 长期目标（3个月内）：
1. 支持多团队/组织
2. 集成区块链钱包
3. 实现高级风控功能
4. 多语言国际化支持

---

# 六、开发环境搭建

## 快速启动：
```bash
# 后端启动
cd basaltpass-backend
go mod tidy
go run cmd/basaltpass/main.go

# 前端启动
cd basaltpass-frontend
npm install
npm run dev
```

## 数据库初始化：
```bash
# 自动迁移数据库表结构
go run cmd/basaltpass/main.go migrate
```

## Docker部署：
```bash
# 使用Docker Compose启动
docker-compose up -d
```

## 团队功能测试：
```bash
# 运行团队API测试脚本
./test_team_api.ps1
```

---

这个项目目前已经完成了基础架构、核心认证功能、团队管理系统和多币种钱包系统，正在向完整的用户账户与钱包中心系统迈进。通过模块化的设计和清晰的架构，为后续功能扩展奠定了坚实的基础。




