# 快速开始与本地开发

本文档覆盖：如何在本地把 BasaltPass 的后端 + 前端多控制台跑起来，并理解常用端口与脚本。

## 方式 A：Docker Compose（最省心）

在项目根目录执行：

```bash
docker-compose up -d --build
```

默认：
- 后端：`http://localhost:8080`
- 前端（可能由 compose 映射决定）：`http://localhost:3000`

## 方式 B：本地/Dev Container 一键启动（推荐日常开发）

项目提供脚本：

```bash
./scripts/dev.sh up
./scripts/dev.sh status
./scripts/dev.sh logs
./scripts/dev.sh down
```

常用端口（脚本默认）：
- 后端：`8080`
- user 控制台：`5173`
- tenant 控制台：`5174`
- admin 控制台：`5175`

## 环境变量与敏感配置

- 项目根 `.env`：推荐放敏感/经常变动的变量（例如 `JWT_SECRET`、数据库密码、第三方 key）。
- 后端配置文件：`basaltpass-backend/config/config.yaml`（系统级默认配置）。
- 运行时覆盖：可用环境变量 `BASALTPASS_*` 覆盖配置（点号改下划线）。

配置优先级（高 → 低）：
1. 进程环境变量（包含 `.env` 加载的内容）
2. `config.yaml`
3. 代码默认值

> 注意：后端 JWT 需要 `JWT_SECRET`；不设置在非测试模式下会 panic。

## 开发期生成的路由表

启动后端（develop）时，会自动导出路由表到：
- `docs/ROUTES.md`

该文件是自动覆盖生成的，请不要手工编辑。
