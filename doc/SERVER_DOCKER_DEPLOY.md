# BasaltPass 服务器部署（Docker Compose）

本文档适用于在一台 Linux 服务器上用 Docker Compose 启动 BasaltPass（后端 + 前端）。

## 1. 前置条件

- 一台 Linux 服务器（Ubuntu/Debian/CentOS 均可，以下示例以 Ubuntu/Debian 为主）
- 已安装：Docker Engine + Docker Compose Plugin
  - 验证：
    - `docker --version`
    - `docker compose version`
- 已安装：Git
  - 验证：`git --version`

## 2. 拉取代码

```bash
git clone <你的仓库地址> BasaltPass
cd BasaltPass
```

> 如果你是把代码包上传到服务器，确保目录里包含：`docker-compose.yml`、`backend.Dockerfile`、`frontend.Dockerfile`、`basaltpass-backend/`、`basaltpass-frontend/`。

## 3. 配置 .env（生产建议）

项目根目录的 `docker-compose.yml` 会读取根目录的 `.env`。

从示例创建：

```bash
cp .env.example .env
```

推荐的生产配置（至少要设置 `JWT_SECRET`）：

```dotenv
# 强烈建议：生产环境务必替换成强随机值
JWT_SECRET=<请生成一个强随机密钥>

# 生产环境建议使用 production（避免开发环境自动创建默认超管）
BASALTPASS_ENV=production

# 把 sqlite 数据库存到 volume 挂载目录，保证容器重建后数据仍在
BASALTPASS_DATABASE_DRIVER=sqlite
BASALTPASS_DATABASE_PATH=/data/basaltpass.db

# 监听端口（容器内）
BASALTPASS_SERVER_ADDRESS=:8080
```

生成强随机密钥（任选其一）：

```bash
# 方式 1：openssl
openssl rand -hex 32

# 方式 2：python
python3 - << 'PY'
import secrets
print(secrets.token_hex(32))
PY
```

## 4. 启动方式

### 方式 A：最简单（直接暴露 3000/8080）

> 适合内网/测试；生产环境不建议把 8080 直接暴露到公网。

```bash
docker compose up -d --build
```

访问：

- 前端：`http://<服务器IP>:3000`
- 后端：`http://<服务器IP>:8080`（例如健康检查 `GET /api/v1/health`）

查看状态/日志：

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

### 方式 B：推荐（只对外暴露 80/443，经反向代理转发）

推荐做法：

- 防火墙只开放 `80/443`
- 后端 `8080`、前端 `3000` 仅在内网可访问（或仅绑定到 `127.0.0.1`）

你可以用 Nginx/Caddy 做反向代理：

- `/` -> 前端容器
- `/api/` -> 后端容器

> 反代的具体配置和你域名/证书方案有关；如果你希望我根据你的域名与端口规划写一份 Nginx 或 Caddy 配置模板，告诉我：域名、是否 HTTPS、是否要把 3000/8080 对公网隐藏。

## 5. 首次初始化管理员（重要）

### 5.1 开发环境默认超管（仅 develop 且首次空库）

后端在 **开发环境**（`BASALTPASS_ENV=develop`）且 **首次运行空数据库** 时，会自动创建一个超级管理员：

- 邮箱：`a@.a`
- 手机：`101`
- 密码：`123456`

这在容器日志里会出现：`Seeded development superadmin user`。

### 5.2 生产环境如何安全地初始化管理员

当 `BASALTPASS_ENV=production` 时，不会自动创建上述默认超管。

如果你需要“引导式”创建首个管理员账号，一个可行且更安全的流程是：

1. **首次启动前**，确保服务器暂时不对公网开放（或仅允许你自己的 IP 访问 3000/8080）。
2. 临时把 `.env` 设置为：`BASALTPASS_ENV=develop`，启动一次，让系统生成默认超管。
3. 登录后立刻：
   - 创建你自己的管理员账号
   - 给该账号授予管理员/超管权限（通过管理端页面或 API）
   - 修改/禁用默认超管账号（至少要改掉默认密码）
4. 把 `.env` 改回：`BASALTPASS_ENV=production`，重启服务。

重启命令：

```bash
docker compose restart backend
```

> 注意：这个“临时 develop 引导”只应在受控网络环境下做一次，并且务必第一时间替换默认密码。

## 6. 更新/回滚

更新代码后重建并重启：

```bash
git pull
docker compose up -d --build
```

如果只想重启：

```bash
docker compose restart
```

停止：

```bash
docker compose down
```

停止并删除数据卷（会清空 sqlite 数据库，谨慎！）：

```bash
docker compose down -v
```

## 6.1 开机自启（systemd，可选）

如果你希望服务器重启后自动拉起服务，可以创建一个 systemd unit。

新建 `/etc/systemd/system/basaltpass.service`（把 `WorkingDirectory` 改成你服务器上的真实路径）：

```ini
[Unit]
Description=BasaltPass (Docker Compose)
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/BasaltPass
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now basaltpass
sudo systemctl status basaltpass
```

## 7. 备份（SQLite）

数据库文件默认在挂载卷目录 `/data/basaltpass.db`（容器内）。常见备份方法：

1. 停止服务（保证一致性）：`docker compose stop backend`
2. 找到 volume 的宿主机路径并备份（或用 `docker run --rm` 挂载该 volume 导出文件）
3. 启动服务：`docker compose start backend`

如果你希望“零停机/低停机”的备份方式（例如 sqlite `.backup`），需要结合具体 DB 路径与容器工具支持，我也可以补充一段可执行脚本。

## 8. 常见问题

### 8.1 后端启动报 sqlite/cgo 相关错误

如果你看到类似：`go-sqlite3 requires cgo`，说明二进制未启用 CGO。
本仓库的 Dockerfile 已按 SQLite 需要启用 CGO；请确保用最新镜像重建：

```bash
docker compose build --no-cache backend
docker compose up -d
```
