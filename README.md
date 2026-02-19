# BasaltPass

BasaltPass 是一个面向多应用/跨项目的身份与权限平台（AuthN/AuthZ），提供：登录注册、OAuth2/OIDC、租户隔离、RBAC、以及面向第三方服务的 S2S API。你可以把它当作“可自托管的认证中心 + 管理控制台 + 开发者友好的接口层”。

如果你正在做：多租户后台、需要给第三方 App 发放 `client_id/client_secret`、想把“用户/角色/权限/订阅”收敛成统一服务，BasaltPass 可以直接落地并扩展。

## 能帮开发者做什么

- 给业务系统提供统一的用户体系（注册、登录、2FA 等基础能力）
- 提供 OAuth2/OIDC 标准集成面（适配 Web/移动端/服务端）
- 在“租户”维度管理用户、角色、权限与资源隔离
- 给第三方 App/后端服务提供稳定的 **S2S（Service-to-Service）API**（client credentials + scopes）
- 附带 3 个控制台（user / tenant / admin），可开箱即用做管理后台

## 项目亮点

- **多控制台架构**：提供 user/tenant/admin 三个分离前端应用，覆盖不同角色的操作面。
- **最小权限授权（Scopes）**：OAuth client scopes 可细分到 S2S 能力（并兼容旧版聚合 scope），便于第三方 app 做最小授权。
- **S2S 调用能力**：专门的 `/api/v1/s2s` 路由，适合后端服务间拉取用户/RBAC/钱包/消息/商品拥有等数据；支持审计与限流。
- **文档与 OpenAPI**：仓库内维护 OpenAPI 描述与使用文档，便于生成 SDK/做自动化集成。

## 项目结构（高层）

- `basaltpass-backend/`：Go 后端（API、鉴权、业务域、S2S）
- `basaltpass-frontend/`：前端（Vite + React + TS），包含 user/tenant/admin 三个应用
- `docs/`：开发者文档、用户/API 文档、OpenAPI 参考
- `scripts/`：本地开发一键脚本

## Quick Start with Docker

```bash
# build and run
docker-compose up -d --build

# backend at http://localhost:8101
# frontend at http://localhost:5173 (user), http://localhost:5174 (tenant), http://localhost:5175 (admin)
```

Default admin login: create via API then assign `admin` role. 

## Documentation

- Docs entry: [BasaltPass Documentation](https://basaltbase.github.io/BasaltPass/)
- Developer docs: ./docs/developer/README.md
- User/API docs: ./docs/user/README.md

推荐从这些文档开始：

- S2S 接口：`docs/user/s2s.md`、`docs/reference/s2s-api.md`
- OpenAPI：`docs/reference/openapi.yaml`
- Repo 结构与约定：`docs/developer/repo-structure.md`

## Local Dev (Dev Container / 非 Docker)

在容器/本机直接跑前后端（后端 + 三个控制台）可以用一键脚本：

```bash
./scripts/dev.sh up
./scripts/dev.sh status
./scripts/dev.sh logs
./scripts/dev.sh down
```

默认端口：后端 `8101`，user `5173`，tenant `5174`，admin `5175`。

启动后常用入口：

- Backend: http://localhost:8101
- User Console: http://localhost:5173
- Tenant Console: http://localhost:5174
- Admin Console: http://localhost:5175

## 配置约定（env vs config）

- `.env`（项目根）：放置敏感/经常变动的变量，例如 `JWT_SECRET`、数据库密码、第三方 API Key；同时可用 `BASALTPASS_*` 覆盖配置（把点号改为下划线）。
- `basaltpass-backend/config/config.yaml`：系统级、相对稳定的默认配置，例如 CORS 白名单、监听端口、SQLite 路径等。

优先级（高 → 低）：
1. 进程环境变量（包含从 `.env` 加载的内容）
2. 配置文件 `config.yaml`
3. 代码中的默认值

Docker 运行时：`docker-compose.yml` 会读取根目录 `.env`，同时为 `JWT_SECRET` 提供默认回退。

## 典型使用方式

- 你的业务服务把 BasaltPass 当作“用户与权限中心”，只保留业务域数据。
- 第三方 App 通过 `client_id + client_secret` 调用 S2S API 拉取用户信息/角色/权限等（配合 scopes 做最小权限）。
- Tenant/Admin 控制台用于给客户（租户）做成员管理、OAuth client 管理、权限配置与审计。

## 安全与可观测性（S2S）

- 建议在生产环境 **禁用 query 传 client_secret**（配置：`s2s.allow_query_credentials: false`）。
- S2S 支持按 `client_id` 的简易限流（默认开启；多实例建议在网关层做全局限流）。
- S2S 支持审计日志（包含 `request_id`、client/app/tenant、path/status 等）。

## 演示请求
如果想要请求实机演示或额外功能，请联系hollowdata@outlook.com或basaltbase@hollowdata.com。