# 配置体系

BasaltPass 有两层配置：

1. **服务配置**（server/database/cors/email 等）：主要来自 `basaltpass-backend/config/config.yaml`，可被环境变量覆盖。
2. **系统设置**（站点名、是否允许注册、OAuth 允许回调域等）：主要存储在 `basaltpass-backend/config/settings.yaml`（文件型设置），可通过管理员 API 读写。

## 1) 服务配置（config.yaml）

- 默认位置：`basaltpass-backend/config/config.yaml`
- 示例文件：`basaltpass-backend/config/example.config.yaml` / `settings.example.yaml`

环境变量覆盖：
- 前缀：`BASALTPASS_`
- 键名转换：把点号 `.` 替换成下划线 `_`

示例：

```bash
export BASALTPASS_SERVER_ADDRESS=:8080
export BASALTPASS_DATABASE_DRIVER=sqlite
export BASALTPASS_DATABASE_PATH=./data/basaltpass.db
```

敏感变量（推荐放 `.env`）：
- `JWT_SECRET`

## 2) 系统设置（settings.yaml）

默认路径：
- `basaltpass-backend/config/settings.yaml`

可用环境变量覆盖：
- `BASALTPASS_SETTINGS_FILE`

启动时：后端会读取该文件并缓存；若文件不存在会自动生成默认值。

管理员 API（以 /api/v1/admin 为例）常用端点：
- `GET /api/v1/admin/settings?category=general`
- `GET /api/v1/admin/settings/:key`
- `POST /api/v1/admin/settings`
- `PUT /api/v1/admin/settings/bulk`

> 注意：历史上有一批管理员端点仍挂在 `/api/v1/tenant/*`，同时存在 `/api/v1/admin/*` 别名。
