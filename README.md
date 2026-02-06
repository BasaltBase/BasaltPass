## Quick Start with Docker

```bash
# build and run
docker-compose up -d --build

# backend at http://localhost:8080
# frontend at http://localhost:3000
```

Default admin login: create via API then assign `admin` role. 

## Documentation

- Docs entry: ./docs/README.md
- Developer docs: ./docs/developer/README.md
- User/API docs: ./docs/user/README.md

## Local Dev (Dev Container / 非 Docker)

在容器/本机直接跑前后端（后端 + 三个控制台）可以用一键脚本：

```bash
./scripts/dev.sh up
./scripts/dev.sh status
./scripts/dev.sh logs
./scripts/dev.sh down
```

默认端口：后端 `8080`，user `5173`，tenant `5174`，admin `5175`。

## 配置约定（env vs config）

- `.env`（项目根）：放置敏感/经常变动的变量，例如 `JWT_SECRET`、数据库密码、第三方 API Key；同时可用 `BASALTPASS_*` 覆盖配置（把点号改为下划线）。
- `basaltpass-backend/config/config.yaml`：系统级、相对稳定的默认配置，例如 CORS 白名单、监听端口、SQLite 路径等。

优先级（高 → 低）：
1. 进程环境变量（包含从 `.env` 加载的内容）
2. 配置文件 `config.yaml`
3. 代码中的默认值

Docker 运行时：`docker-compose.yml` 会读取根目录 `.env`，同时为 `JWT_SECRET` 提供默认回退。