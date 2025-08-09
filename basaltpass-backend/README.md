# BasaltPass Backend

基于Go Fiber的用户账户与钱包中心后端服务

## 技术栈

- **框架**: Go Fiber v2.52.0
- **数据库**: SQLite (支持MySQL迁移)
- **ORM**: GORM v1.25.5
- **认证**: JWT (golang-jwt/jwt/v5)
- **密码加密**: bcrypt

## 快速开始

### 环境要求

- Go 1.21+
- SQLite (内置)

### 安装依赖

```bash
### 配置（可选）

后端支持从配置文件与环境变量加载设置。

- 配置文件：在工作目录或 `./config` 放置 `config.yaml`（示例见 `config.example.yaml`）。
- 环境变量：以 `BASALTPASS_` 前缀覆盖，例如：

```
BASALTPASS_SERVER_ADDRESS=:8081
BASALTPASS_DATABASE_DRIVER=sqlite
BASALTPASS_DATABASE_PATH=./data/basaltpass.db
```

支持的主要字段：

- server.address
- database.driver / database.dsn / database.path（当前支持 sqlite）
- cors.allow_origins / allow_methods / allow_headers / allow_credentials / expose_headers / max_age_seconds
cd basaltpass-backend
go mod tidy
```

### 运行项目

```bash
go run cmd/basaltpass/main.go
```

服务器将在 `http://localhost:8080` 启动

### 构建项目

```bash
go build cmd/basaltpass/main.go
```

## API 接口

### 健康检查

```
GET /health
```

### 用户认证

#### 注册用户
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "13800138000",  // 可选
  "password": "password123"
}
```

#### 用户登录
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "user@example.com",  // 邮箱或手机号
  "password": "password123"
}
```

#### 刷新令牌
```
POST /api/v1/auth/refresh
```

### 用户资料 (需要JWT认证)

#### 获取用户资料
```
GET /api/v1/user/profile
Authorization: Bearer <access_token>
```

#### 更新用户资料
```
PUT /api/v1/user/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar": "头像URL"
}
```

## 项目结构

```
basaltpass-backend/
├── cmd/basaltpass/          # 应用入口
│   └── main.go
├── internal/                # 内部包
│   ├── api/                 # API路由
│   ├── auth/                # 认证相关
│   ├── common/              # 公共组件
│   ├── model/               # 数据模型
│   └── user/                # 用户管理
├── docs/                    # 文档
└── go.mod                   # Go模块文件
```

## 数据库

项目使用SQLite作为默认数据库，数据库文件为 `basaltpass.db`。

### 数据模型

- **User**: 用户基本信息
- **Role**: 角色定义
- **UserRole**: 用户角色关联
- **Wallet**: 钱包账户
- **WalletTx**: 钱包交易记录
- **AuditLog**: 审计日志

## 开发

### 添加新的API端点

1. 在 `internal/api/router.go` 中添加路由
2. 创建对应的handler和service
3. 定义DTO结构体

### 数据库迁移

项目使用GORM自动迁移，在 `internal/common/migrate.go` 中定义模型。

## 部署

### Docker部署

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o main cmd/basaltpass/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

## 许可证

MIT License 