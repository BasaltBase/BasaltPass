# BasaltPass 系统概览

## 🎯 项目状态

### ✅ 已完成
- **后端架构**: Go + Fiber + GORM + PostgreSQL
- **前端架构**: React 18 + TypeScript + Vite + TailwindCSS  
- **OAuth2/OIDC实现**: 完整的授权服务器实现
- **多租户架构**: 租户、应用、OAuth客户端分离设计
- **管理界面**: 租户和应用管理的完整前端页面
- **编译状态**: 前后端均可成功编译

### 🏗️ 系统架构

#### 后端结构
```
basaltpass-backend/
├── cmd/basaltpass/main.go          # 主入口
├── internal/
│   ├── api/router.go               # 路由配置
│   ├── auth/                       # 认证服务
│   ├── oauth/                      # OAuth2/OIDC实现
│   ├── app/                        # 应用管理
│   ├── model/                      # 数据模型
│   └── common/                     # 公共中间件
└── docs/openapi.yaml              # API文档
```

#### 前端结构
```
basaltpass-frontend/
├── src/
│   ├── components/                 # 可复用组件
│   │   ├── AdminLayout.tsx        # 管理布局
│   │   └── LoadingSpinner.tsx     # 加载组件
│   ├── pages/                      # 页面组件
│   │   ├── admin/                 # 管理页面
│   │   │   ├── TenantList.tsx     # 租户列表
│   │   │   ├── CreateTenant.tsx   # 创建租户
│   │   │   ├── AppList.tsx        # 应用列表
│   │   │   ├── CreateApp.tsx      # 创建应用
│   │   │   └── OAuthClientConfig.tsx # OAuth配置
│   │   └── auth/                  # 认证页面
│   ├── api/                       # API客户端
│   ├── contexts/                  # React上下文
│   └── types/                     # TypeScript类型
└── package.json
```

### 🔑 核心功能

#### 1. 多租户管理
- **租户创建**: 支持组织级别的租户创建
- **租户配置**: 自定义域名、品牌设置
- **用户邀请**: 租户级用户管理

#### 2. 应用管理  
- **应用注册**: 为每个租户创建独立应用
- **应用配置**: 重定向URI、权限范围设置
- **应用状态**: 启用/禁用应用访问

#### 3. OAuth2/OIDC服务
- **授权服务器**: 完整的OAuth2实现
- **客户端管理**: 动态客户端注册
- **令牌管理**: 访问令牌和刷新令牌
- **OIDC Discovery**: 标准发现端点

#### 4. 认证与授权
- **JWT认证**: 基于JWT的会话管理
- **RBAC权限**: 基于角色的访问控制
- **中间件**: 租户隔离和权限验证

### 🌐 API端点

#### 认证相关
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/logout` - 用户登出

#### 租户管理 (需要租户管理员权限)
- `GET /api/v1/admin/tenant` - 获取租户信息
- `PUT /api/v1/admin/tenant` - 更新租户信息
- `POST /api/v1/admin/tenant/users/invite` - 邀请用户

#### 应用管理 (需要租户管理员权限)
- `POST /api/v1/admin/apps` - 创建应用
- `GET /api/v1/admin/apps` - 获取应用列表
- `GET /api/v1/admin/apps/:id` - 获取应用详情
- `PUT /api/v1/admin/apps/:id` - 更新应用
- `DELETE /api/v1/admin/apps/:id` - 删除应用

#### OAuth2客户端管理
- `POST /api/v1/admin/oauth/clients` - 创建OAuth客户端
- `GET /api/v1/admin/oauth/clients` - 获取客户端列表
- `PUT /api/v1/admin/oauth/clients/:id` - 更新客户端
- `DELETE /api/v1/admin/oauth/clients/:id` - 删除客户端

#### OAuth2授权流程
- `GET /api/v1/oauth/authorize` - 授权端点
- `POST /api/v1/oauth/token` - 令牌端点
- `GET /api/v1/oauth/userinfo` - 用户信息端点
- `GET /.well-known/openid_configuration` - OIDC发现端点

### 🚀 快速开始

#### 1. 环境要求
- Go 1.21+
- Node.js 18+
- PostgreSQL 12+

#### 2. 启动开发环境
```powershell
# 使用提供的启动脚本
.\start_dev.ps1

# 或手动启动
# 后端
cd basaltpass-backend
go run cmd/basaltpass/main.go

# 前端 (另一个终端)
cd basaltpass-frontend  
npm run dev
```

#### 3. 访问地址
- **前端**: http://localhost:5173
- **后端API**: http://localhost:8080
- **健康检查**: http://localhost:8080/health
- **OIDC发现**: http://localhost:8080/.well-known/openid_configuration

### 📝 下一步开发计划

#### 优先级 1 (核心功能)
- [ ] 数据库迁移和初始化脚本
- [ ] 管理员用户创建脚本
- [ ] OAuth2授权流程端到端测试
- [ ] 前端路由和权限保护

#### 优先级 2 (增强功能)
- [ ] 邮件服务集成（用户邀请、密码重置）
- [ ] 审计日志界面
- [ ] 用户管理界面
- [ ] 权限管理界面

#### 优先级 3 (高级功能)
- [ ] 多因素认证(2FA)
- [ ] WebAuthn支持
- [ ] 社交登录集成
- [ ] API限流和监控

### 🔧 开发工具

#### 测试脚本
- `test_complete_system.ps1` - 完整系统测试
- `start_dev.ps1` - 开发环境启动
- `test_*.ps1` - 各种API测试脚本

#### 配置文件
- `docker-compose.yml` - Docker开发环境
- `frontend.Dockerfile` / `backend.Dockerfile` - 容器化部署
- `docs/openapi.yaml` - API文档

### 📚 技术栈详情

#### 后端技术栈
- **Web框架**: Fiber (高性能HTTP框架)
- **ORM**: GORM (Go语言ORM)
- **数据库**: PostgreSQL
- **认证**: JWT + 自定义中间件
- **OAuth2**: 自实现OAuth2/OIDC服务器

#### 前端技术栈
- **框架**: React 18 (函数组件 + Hooks)
- **类型系统**: TypeScript
- **构建工具**: Vite
- **样式**: TailwindCSS
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **图标**: Heroicons

#### 数据库设计
- **多租户隔离**: 基于tenant_id的行级安全
- **OAuth2模型**: 标准OAuth2数据模型
- **审计日志**: 操作审计和安全日志
- **关系设计**: 外键约束和级联删除

这个系统现在已经具备了完整的OAuth2/OIDC身份提供商的基础架构，可以为多租户环境提供安全的身份认证和授权服务。
