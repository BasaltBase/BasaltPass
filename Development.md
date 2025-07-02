这个项目是一个面向B端和C端SaaS化、平台化的「用户账户与钱包中心」，能作为**所有业务项目的单点认证和账户系统**（SSO/Identity Hub），未来可以发展成模块化的账户基础设施。

---

# 一. 项目命名

BasaltPass

# 二. 敏捷开发一周提纲

## **【Day 1：基础架构与环境搭建】**

* 初始化go fiber（最新版本） +sqlite 项目，ORM选型（如gorm或ent）
* 完成数据库表结构设计（用户、角色、认证、钱包、操作日志等）
* 配置Go Fiber的基础中间件（日志、CORS、安全头）
* React + Tailwind + Vite 前端脚手架初始化（最新版本）
* 设计项目目录结构，接口风格（RESTful/OpenAPI）

## **【Day 2：用户注册、登录、JWT认证】**

* 实现邮箱/手机号注册、登录、验证码（mock）
* JWT生成与校验中间件，refresh token机制
* 实现用户基础资料（头像、昵称、邮箱、手机号）
* 开发前端登录注册页面、基础Profile页

## **【Day 3：OAuth2/三方登录支持】**

* 对接Google、Meta、Microsoft OAuth2，抽象Provider结构
* OAuth2登录、绑定/解绑流程（新老账户合并）
* UI实现三方登录按钮及回调处理

## **【Day 4：用户安全与账户管理】**

* 密码重置、二次验证（TOTP、短信/邮箱二步验证）
* 密保问题、手机号更换、注销、风控审计表
* 用户角色和权限（RBAC模型，基础角色维护页面）
* 前端控制台完善（账号安全设置、二次验证管理）

## **【Day 5：多币种钱包系统】**

* 钱包账户模型（支持多币种：USD, CNY, BTC, ETH等，方便未来扩展）
* 钱包充值、提现、余额查询（mock接口或对接测试网）
* 交易记录、充值/提现审批流
* 钱包UI组件开发（余额、充值、提现、历史）

## **【Day 6：管理后台、系统UI完善】**

* 用户列表、搜索、权限分配
* 钱包流水、交易管理
* 日志审计页面、异常处理、全局通知
* 响应式UI自适应优化、深色模式

## **【Day 7：测试、优化与部署】**

* 集成测试、e2e测试（重点是身份验证和钱包安全）
* docker化部署（前后端一体或分开）
* 文档输出（接口文档、部署文档、运维手册）
* 演示及初步评估，收集反馈（复盘&规划下一步）

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

# 3. 架构设计

## 3.1. 数据库设计

当然可以，Henry。以下为你定制一套**详细的系统架构方案和实施细则**，涵盖技术选型、系统模块、数据流、接口约定、安全策略以及落地分阶段计划，确保方案既能高效落地，也易于长期演进。

---

# 一、系统整体架构设计

## 1. 架构图（简述）

``` go
      ┌────────────┐         ┌─────────────┐        ┌──────────┐
      │ 前端客户端 │  <---->  │ API 网关层  │ <----> │  后端服务│
      └────────────┘         └─────────────┘        └──────────┘
            │                      │                     │
            │                      │                ┌─────────┐
            │                      │                │  数据库  │
            │                      │                └─────────┘
            │                      │
            │                  ┌─────────┐
            │                  │三方OAuth│
            │                  └─────────┘
```

* **前端**：React + Tailwind，区分用户端（PC/Mobile）与管理控制台（Admin）
* **API网关层**：Fiber实现，统一鉴权、路由转发、流控
* **后端服务**：分领域分包管理（User、Auth、Wallet、OAuth、Security等）
* **数据库**：SQLite（兼容MySQL迁移，使用ORM抽象）
* **第三方OAuth服务**：Google、Meta、Microsoft

## 2. 系统模块分层

### (1) 前端层

* 登录注册页面（支持邮箱、手机号、三方）
* 个人中心（资料、头像、安全设置、2FA、绑定管理）
* 钱包中心（多币种余额、充值/提现、流水、资产明细）
* 管理后台（用户列表、角色、权限、钱包操作审计、风控管理）

### (2) 网关与接口层

* JWT/OAuth2认证过滤、Rate limit、CORS、API日志
* RESTful接口风格（支持OpenAPI/Swagger文档）

### (3) 业务服务层

* **User服务**：注册、登录、资料、头像上传、账号安全
* **Auth服务**：密码管理、二次验证、密保、注销、手机号邮箱更换等
* **OAuth服务**：三方账号接入/绑定
* **Wallet服务**：多币种账户、余额变动、充值提现、流水审计
* **RBAC服务**：角色、权限、资源管理
* **通知与日志服务**：账户操作日志、消息提醒、异常审计

### (4) 数据层

* SQLite表结构，领域分表（user, wallet, wallet\_tx, role, user\_role, oauth, audit\_log等）

---

# 二、详细技术方案

## 1. 技术栈

* **后端**：Go + Fiber + GORM（ORM，便于MySQL/SQLite自由切换）+ jwt-go + go-oauth2
* **前端**：React (Vite) + Tailwind CSS + Ant Design（管理台） + SWR/Axios
* **数据库**：SQLite（默认），可一键切换MySQL
* **部署**：Docker、CI/CD（GitHub Actions），开发与生产分离

## 2. 关键功能设计

### (1) 用户身份认证（支持多种方式）

* 传统：用户名+密码，邮箱验证码，手机号验证码
* OAuth2：Google、Meta、Microsoft，一键登录和绑定
* JWT：标准Access/Refresh机制，HTTP-only cookie安全方案
* 二步验证（2FA）：支持TOTP（兼容Google Authenticator）

### (2) 钱包系统

* 多币种账户：资产结构（user\_id, currency, balance, freeze, created\_at）
* 钱包操作：充值、提现、余额查询、流水记录
* 充值/提现风控：白名单、额度、操作日志、审批（可选后续版本扩展）
* 交易模型：状态（pending、success、fail）、事务隔离

### (3) 账户安全

* 密保问题、找回流程
* 修改绑定手机号、邮箱、注销账号
* 操作审计日志（敏感操作记录、异常报警）

### (4) 角色与权限（RBAC）

* 支持多角色：普通用户、VIP、管理员、风控、财务等
* 资源/接口权限粒度控制
* 后台动态分配角色/权限

### (5) 管理后台

* 用户列表、筛选、封禁
* 钱包流水和账户统计
* 操作日志与风险审计

---

# 三、数据库结构（ER简图）

```
[User]----< [Wallet] ----< [WalletTx]
  │            │
  │        [AuditLog]
  │
[OAuth]
  │
[Role]----< [UserRole]
```

* User：基本信息
* OAuth：第三方绑定
* Wallet：多币种
* WalletTx：资金流水
* Role/UserRole：多角色
* AuditLog：敏感操作

---

# 四、接口约定示例

### 用户注册/登录

* POST /api/v1/auth/register
* POST /api/v1/auth/login
* POST /api/v1/auth/oauth/{provider}/login
* POST /api/v1/auth/oauth/{provider}/bind

### 个人资料

* GET /api/v1/user/profile
* PUT /api/v1/user/profile
* POST /api/v1/user/avatar

### 钱包

* GET /api/v1/wallet/balance
* POST /api/v1/wallet/recharge
* POST /api/v1/wallet/withdraw
* GET /api/v1/wallet/history
* POST /api/v1/wallet/transfer

### 安全操作

* POST /api/v1/security/2fa/setup
* POST /api/v1/security/2fa/verify
* PUT /api/v1/security/password
* PUT /api/v1/security/email
* PUT /api/v1/security/phone
* DELETE /api/v1/account

### 管理后台

* GET /api/v1/admin/users
* POST /api/v1/admin/user/{id}/ban
* GET /api/v1/admin/wallets
* GET /api/v1/admin/logs

---

# 五、安全策略与最佳实践

* 所有敏感API强制登录态（JWT），重要操作需二次认证
* 前端CSRF防护，后端Rate limit防爆破
* 用户密码加密存储（bcrypt/scrypt），token存储加密
* 操作日志与异常自动通知
* 头像、资料文件存储分离，限制上传类型和大小
* 支持日志审计、异常报警

---

# 六、实施落地（建议分阶段敏捷迭代）

| 阶段 | 目标             | 核心任务                   |
| -- | -------------- | ---------------------- |
| 1  | MVP原型（基础账户+钱包） | 账户注册、JWT登录、资料、基本钱包、UI  |
| 2  | Oauth与安全       | 三方登录、2FA、密保、注销、安全UI    |
| 3  | 钱包拓展与审计        | 多币种钱包、充值提现、审计、风控       |
| 4  | 管理后台与RBAC      | 后台管理、角色、权限、用户风控        |
| 5  | 优化与迁移          | 性能优化、数据库迁移、测试、文档、CI/CD |

---

# 七、文件结构


## 2.3 项目目录建议（详细版）

### **一、后端目录结构（Go + Fiber）**

```
/basaltpass-backend
├── cmd/                   # 启动命令入口
│   └── basaltpass/           # 可包含main.go（支持多入口或多进程）
│       └── main.go
│
├── configs/               # 配置文件（如config.yaml、env、密钥等）
│
├── internal/              # 核心业务逻辑（按领域分层）
│   ├── auth/              # 认证相关（注册、登录、jwt、2FA）
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── middleware.go
│   │   ├── model.go
│   │   └── util.go
│   │
│   ├── user/              # 用户管理（资料、头像、绑定等）
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── model.go
│   │   └── dto.go
│   │
│   ├── wallet/            # 钱包与资金流
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── model.go
│   │   ├── tx.go          # 钱包流水、交易相关
│   │   └── currency.go
│   │
│   ├── oauth/             # OAuth2/第三方登录
│   │   ├── handler.go
│   │   ├── provider.go
│   │   ├── model.go
│   │   └── util.go
│   │
│   ├── security/          # 账户安全（2FA、密保、风控）
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── model.go
│   │   └── audit.go       # 审计日志
│   │
│   ├── rbac/              # 角色与权限（如有）
│   │   ├── handler.go
│   │   ├── model.go
│   │   └── service.go
│   │
│   ├── admin/             # 后台管理（可选分开）
│   │   ├── handler.go
│   │   └── service.go
│   │
│   └── common/            # 公共方法、通用中间件、响应、错误码
│       ├── response.go
│       ├── error.go
│       ├── middleware.go
│       └── utils.go
│
├── migrations/            # 数据库迁移脚本（sql/gorm/ent等）
│   └── 2023xxxx_init.sql
│
├── scripts/               # 启动、构建、测试脚本
│
├── tests/                 # 单元测试与集成测试
│
├── docs/                  # 接口文档（openapi/spec）、部署文档、设计文档
│
├── go.mod / go.sum
└── README.md
```

#### 说明

* **internal**：每个子模块下分handler（控制器）、service（业务）、model（结构体）、dto（参数）、util（工具）。
* **common**：抽象响应格式、错误处理、中间件复用。
* **configs**：支持多环境配置。
* **migrations**：数据库变更版本化。
* **docs**：专门存放OpenAPI接口、数据库ER图、部署说明、业务规范。

---

### **二、前端目录结构（React + Tailwind）**

```
/basaltpass-frontend
├── public/                    # 静态资源、favicon、manifest
│
├── src/
│   ├── pages/                 # 路由页面（每个大模块一级目录）
│   │   ├── auth/              # 登录、注册、找回密码、三方登录
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── OauthCallback.tsx
│   │   │   └── ResetPassword.tsx
│   │   │
│   │   ├── profile/           # 用户中心（个人资料、绑定、2FA等）
│   │   │   ├── Index.tsx
│   │   │   ├── EditProfile.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Security.tsx
│   │   │
│   │   ├── wallet/            # 钱包（多币种、明细、充值提现）
│   │   │   ├── Index.tsx
│   │   │   ├── Recharge.tsx
│   │   │   ├── Withdraw.tsx
│   │   │   └── History.tsx
│   │   │
│   │   ├── admin/             # 管理后台（用户/钱包/权限管理）
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Wallets.tsx
│   │   │   ├── Logs.tsx
│   │   │   └── Roles.tsx
│   │   │
│   │   └── NotFound.tsx
│   │
│   ├── components/            # 复用组件库（表单、弹窗、导航、按钮等）
│   │   ├── Layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── UserAvatar.tsx
│   │   ├── CurrencySelect.tsx
│   │   └── ...
│   │
│   ├── api/                   # 所有前端接口请求封装
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── wallet.ts
│   │   ├── admin.ts
│   │   └── ...
│   │
│   ├── hooks/                 # 自定义Hooks
│   │   ├── useAuth.ts
│   │   ├── useWallet.ts
│   │   └── ...
│   │
│   ├── utils/                 # 通用工具方法
│   │   ├── request.ts
│   │   ├── storage.ts
│   │   └── ...
│   │
│   ├── assets/                # 图片、icon、字体
│   │   ├── logo.svg
│   │   └── ...
│   │
│   ├── styles/                # Tailwind config与自定义样式
│   │   └── index.css
│   │
│   ├── routes/                # 路由配置与守卫
│   │   └── index.tsx
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.tsx
│
├── tests/                     # 单元测试和UI测试
│   └── pages/
│   └── components/
│
├── .env
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

#### 说明

* **pages**：页面级路由，业务主分区
* **components**：高度复用的UI零件，区分布局、表单、业务
* **api**：接口封装，统一异常处理
* **hooks/utils**：提升开发效率
* **assets/styles**：资源管理和样式隔离
* **tests**：支持单元和UI自动化

---

### **三、交互与部署建议**

* **接口风格统一**，前后端约定响应结构（如统一error code、分页格式等）
* **本地开发体验**：分别起dev server（端口区分），使用.env文件配置API基址
* **Docker部署**：前端构建后静态文件交由nginx或fiber托管，后端独立进程，便于横向扩容








