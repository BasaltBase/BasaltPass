

# 一. 项目概述

BasaltPass - 玄武岩通行证

这个项目是一个面向B端和C端SaaS化、平台化的「用户账户与钱包中心」，能作为**所有业务项目的单点认证和账户系统**（SSO/Identity Hub），未来可以发展成模块化的账户基础设施。

## 定义

- 业务程序（业务项目）：使用BasaltPass的业务程序，一个BP可以支持多个业务程序，程序之间共享用户、钱包、订阅等资源。
- 用户：使用BasaltPass的用户，可以支持多个用户，共享于业务程序的资源。
- 团队：使用BasaltPass的团队，可以支持多个团队，共享于业务程序的资源。
- 钱包：用户或团队的钱包，可以支持多种币种，共享于业务程序的资源。
- 订阅：支持管理来自多个业务程序的订阅，共享于业务程序的资源。

# 二. 技术栈确认

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

# 三. 开发进度
---

BasaltPass 项目开发进度总览：

## 三.1. 已完成功能（Day 1-6）

1. **✅基础架构搭建**
   - Go Fiber + GORM + SQLite 后端
   - React + Vite + Tailwind CSS + TypeScript 前端
   - 完善依赖管理，模块化分层设计

2. **⚠️用户认证系统**
   - 邮箱/手机号注册、登录、验证码（TODO: 现在仅为mock，后续需要对接真实验证码服务）
   - JWT认证与刷新机制
   - 用户基础资料管理（头像、昵称、邮箱、手机号）
   - 前端登录、注册、个人资料页面

3. **⚠️OAuth2/三方登录**
   - 支持Google、Meta、Microsoft（TODO: 现在仅为mock，后续需要对接真实OAuth2服务）
   - 登录、绑定/解绑流程，Provider抽象
   - 前端三方登录按钮与回调处理

4. **⚠️用户安全与账户管理**
   - 密码重置、二次验证（TOTP、短信/邮箱）
   - 密保、手机号更换、注销、风控审计
   - RBAC角色权限模型，基础角色维护
   - 前端安全设置、2FA管理页面

5. **✅多币种钱包系统**
   - 钱包账户模型（支持多币种及自定义币种）
   - 钱包充值、提现、余额查询
   - 交易记录、充值/提现审批流
   - 钱包UI组件（余额、充值、提现、历史）

6. **✅团队功能系统**
   - 团队模型（Team、TeamMember、TeamRole）
   - 团队角色权限（Owner/Admin/Member）
   - 团队管理（创建、编辑、删除、成员管理）
   - 前端团队管理页面（列表、详情、成员管理）
   - 支持团队钱包扩展

7. **✅通知与邀请系统**
   - 用户、团队、邀请通知，支持广播与定向推送
   - 前端通知中心（已读/未读、批量标记、删除）
   - 管理员后台发送系统通知
   - 团队成员邀请、收件箱页面、相关通知推送

8. **✅管理后台**
   - 用户管理（列表、搜索、禁用/解禁）
   - 钱包管理（用户钱包列表、余额查看）
   - 通知管理（系统通知的创建、删除、列表）
   - 角色分配（基础角色分配接口）
   - 审计日志（操作日志查询接口）

---

## 三.2. 当前进行中（Day 7）

1. **➕钱包系统完善**
   - 钱包模型（Wallet、WalletTransaction）
   - 支持stripe支付
   - 钱包管理（创建、编辑、删除、列表）
   - 前端钱包管理页面（列表、详情、管理）
   - 支持钱包钱包扩展

1. **➕订阅系统**
   - 订阅模型（Subscription、SubscriptionItem、SubscriptionPlan）
   - 订阅管理（创建、编辑、删除、列表）
   - 前端订阅管理页面（列表、详情、管理）
   - 支持订阅钱包扩展

1. **➕管理后台完善**
   - 用户管理、钱包管理、通知管理、角色分配、审计日志页面（部分已实现，部分待完善）

2. **➕系统优化**
   - 性能优化
   - UI完善、响应式设计
   - 深色模式

---

## 三.3. 待开发功能

1. **➕测试与部署**
   - 单元测试、集成测试
   - Docker部署

2. **➕文档完善**
   - API文档、部署文档、用户手册

3. **➕安全加固**
   - 更完善的输入验证、错误处理
   - Rate Limiting、CSRF防护

4. **➕系统监控与告警**
   - 监控、异常告警机制

---

## 三.4. 技术债务与优化点

- 测试覆盖需提升（单元/集成测试）
- 文档需完善（API、部署、用户手册）
- 性能优化（数据库查询、缓存策略）
- 安全加固（输入验证、错误处理）
- 监控告警机制待补充

---

## 三.5. 阶段性目标

### 短期目标（本周内）
1. 完成管理后台基础功能
2. 添加基础测试用例
3. 完善API文档

### 中期目标（下个月）
1. 优化UI/UX设计
2. 添加更多OAuth提供商
3. 实现消息通知系统
4. 完善团队钱包功能

### 长期目标（3个月内）
1. 支持多团队/组织
2. 集成区块链钱包
3. 实现高级风控功能
4. 多语言国际化支持

## 三.6. AI Agent助力开发建议

* 需求拆解与用户故事梳理（AI出user story，自动生成issue）
* 代码生成（如：JWT实现、第三方登录对接、gorm模型自动生成、react表单组件生成、tailwind样式建议）
* 测试用例自动生成（api接口、前端表单验证）
* 技术选型与架构设计评审（AI辅助）
* 文档生成与API自动注释


# 四. 架构设计

## 四.1. 数据库设计

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

## 四.3. 项目结构（实际实现）

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
│   ├── notification/               # 通知模块
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── dto.go
│   ├── subscription/               # 订阅模块
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── dto.go
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

## 四.4. API接口设计（已实现）

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

## 四.5. 团队功能设计

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

## 四.6. 安全策略实现

### 已实现的安全措施：
1. **✅JWT认证**：Access Token + Refresh Token机制
2. **✅密码安全**：bcrypt加密存储
3. **✅OAuth2集成**：支持Google、Meta、Microsoft
4. **✅中间件保护**：JWT验证、管理员权限验证
5. **✅审计日志**：敏感操作记录
6. **✅CORS配置**：跨域请求控制
7. **✅团队权限**：基于角色的团队权限控制

### 待实现的安全措施：
1. **Rate Limiting**：API访问频率限制
2. **CSRF防护**：跨站请求伪造防护
3. **输入验证**：更严格的数据验证

## 四.7. 部署配置

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

# 五. 命令行启动

## 五.1. 快速启动：
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

## 五.2. 数据库初始化：
```bash
# 自动迁移数据库表结构
go run cmd/basaltpass/main.go migrate
```

## 五.3. Docker部署：
```bash
# 使用Docker Compose启动
docker-compose up -d
```

## 五.4. 团队功能测试：
```bash
# 运行团队API测试脚本
./test_team_api.ps1
```



