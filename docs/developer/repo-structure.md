# 仓库结构与模块边界

BasaltPass 仓库包含两大部分：

- 后端：`basaltpass-backend/`（Go + Fiber + GORM）
- 前端：`basaltpass-frontend/`（React + Vite + Tailwind，多控制台 apps）

## 后端关键目录

- `cmd/basaltpass/`：后端启动入口
- `internal/api/v1/`：v1 路由注册（分 routes/*.go）
- `internal/handler/`：HTTP handler（按 admin / tenant / user / public / s2s 分类）
- `internal/middleware/`：JWT、租户上下文、管理员鉴权、S2S client 鉴权、限流等
- `internal/model/`：GORM 模型
- `internal/service/`：业务服务（auth、settings、tenant、wallet、subscription 等）
- `internal/migration/`：迁移与初始化逻辑

## 前端关键目录

- `basaltpass-frontend/apps/`：多 app（admin/tenant/user）入口与壳
- `basaltpass-frontend/src/`：共享组件、API client、路由等

## 三类控制台与权限语义

系统通常按三类控制台理解：

- User Console：普通用户侧
- Tenant Console：租户侧管理（管理自己租户内用户/产品/订阅等）
- Admin Console：平台管理员（全局）

后端 JWT 里有 console scope（`scp`），典型取值：
- `user`
- `tenant`
- `admin`

很多路由会额外要求 scope：例如租户路由使用 `RequireConsoleScope("tenant")`。
