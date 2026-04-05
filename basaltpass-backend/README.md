# BasaltPass Backend

基于 Go Fiber 的多租户身份与权限后端服务。

## 技术栈

- 框架: Go Fiber
- ORM: GORM
- 数据库: MySQL / SQLite
- 认证: JWT

## 当前开发约定

- 默认开发端口: `8101`
- 默认开发配置来源: 仓库根目录 [`.env`](/c:/Users/Administrator/Desktop/WorkPlace/BasaltPass/.env)
- 默认本地 Docker 数据库: MySQL（compose 内服务名 `mysql`）

## 配置加载

后端支持从配置文件与环境变量加载设置。

- 配置文件: `basaltpass-backend/config/config.yaml`
- 环境变量: 以 `BASALTPASS_` 前缀覆盖
- `.env` 默认查找位置: 项目根目录 `./.env`
- 可通过 `BASALTPASS_ENV_FILE` 指定自定义路径

常见变量示例:

```env
JWT_SECRET=change-me
BASALTPASS_SERVER_ADDRESS=:8101
BASALTPASS_DATABASE_DRIVER=mysql
BASALTPASS_DATABASE_DSN=basaltpass:basaltpass@tcp(mysql:3306)/basaltpass?charset=utf8mb4&parseTime=True&loc=Local
```

支持的主要字段:

- `server.address`
- `database.driver`
- `database.dsn`
- `database.path`
- `cors.allow_origins`

## 本地运行

### Docker Compose

在仓库根目录运行:

```bash
cd BasaltPass
docker compose up -d --build
```

启动后:

- Backend: `http://localhost:8101`
- Frontend: `http://localhost:5104`
- MySQL: `localhost:3307`

### 直接运行后端

```bash
cd BasaltPass/basaltpass-backend
go run ./cmd/basaltpass
```

如果从后端目录直接运行，程序仍会自动查找仓库根目录 `.env`。

## 数据库

- 本地 Docker 开发默认使用 MySQL
- `docker-compose.yml` 中的数据库数据通过 Docker volume 持久化
- 生产环境建议使用独立云数据库，并通过 `BASALTPASS_DATABASE_DSN` 注入连接串

## API

- 健康检查: `GET /health`
- S2S 接口说明: `../basaltpass-docs/docs/reference/s2s-api.md`

## 系统设置

系统设置默认存储在:

- `basaltpass-backend/config/settings.yaml`

可通过环境变量覆盖:

- `BASALTPASS_SETTINGS_FILE`

## 测试

```bash
cd BasaltPass/basaltpass-backend
go test ./...
```
