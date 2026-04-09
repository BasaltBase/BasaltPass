# BasaltPassDev -> BasaltPass 发布与部署方案

本文档对应仓库内新增的两条 GitHub Actions：

- `release-vX.Y.Z` tag: 将当前代码快照同步到开放版仓库
- `deploy-prod-vX.Y.Z` tag: 构建镜像并部署到你的 Docker 服务器

## 推荐仓库结构

- `BasaltPassDev`: 你的主开发仓库，持续开发、提交 PR、打 tag
- `BasaltPass`: 对外公开仓库，只接收你确认发布后的版本

这样做的好处是：

- 日常开发不会直接暴露到公开仓库
- 开放版仓库历史可以保持更干净
- 只有发布版本才会同步出去

## 一次性 GitHub 配置

### 1. 重命名当前开发仓库

把当前仓库改名为 `BasaltPassDev`。

然后新建一个公开仓库，例如：

- `your-org/BasaltPass`

公开仓库建议先初始化一个 `README`，确保它从一开始就存在默认分支。

### 2. 在 `BasaltPassDev` 配置 Repository Variables

在 GitHub 仓库 Settings -> Secrets and variables -> Actions -> Variables 中配置：

- `PUBLIC_REPO`: 公开仓库名，例如 `your-org/BasaltPass`
- `PUBLIC_REPO_BRANCH`: 公开仓库默认分支，通常是 `main`
- `DEPLOY_HOST`: Docker 服务器 IP 或域名
- `DEPLOY_PORT`: SSH 端口，默认 `22`
- `DEPLOY_USER`: SSH 登录用户名
- `DEPLOY_PATH`: 服务器部署目录，例如 `/opt/basaltpass`
- `GHCR_NAMESPACE`: 镜像命名空间，通常填你的 GitHub 用户名或组织名

### 3. 在 `BasaltPassDev` 配置 Repository Secrets

在 GitHub 仓库 Settings -> Secrets and variables -> Actions -> Secrets 中配置：

- `PUBLIC_REPO_PUSH_TOKEN`: 能写入开放版仓库的 GitHub PAT
- `DEPLOY_SSH_PRIVATE_KEY`: 用于登录 Docker 服务器的私钥
- `DEPLOY_GHCR_USERNAME`: 服务器拉取 GHCR 镜像使用的用户名
- `DEPLOY_GHCR_TOKEN`: 服务器拉取 GHCR 镜像使用的 Token

权限建议：

- `PUBLIC_REPO_PUSH_TOKEN`: 至少要有目标公开仓库的 `contents:write`
- `DEPLOY_GHCR_TOKEN`: 至少要有 GHCR 的 `read:packages`

## 服务器一次性准备

在 Docker 服务器上执行：

```bash
sudo mkdir -p /opt/basaltpass
cd /opt/basaltpass
cp /path/to/deploy/.env.prod.example .env
```

然后把 `.env` 里的生产环境变量改成你的实际值。

服务器需要预装：

- Docker
- Docker Compose Plugin

## Tag 约定

### 发布到开放版仓库

使用以下 tag：

```bash
git tag release-v0.1.0
git push origin release-v0.1.0
```

触发后会：

1. 拉取当前 `BasaltPassDev` 代码
2. 根据 `.release-sync-ignore` 过滤不需要公开的文件
3. 覆盖同步到 `BasaltPass`
4. 在公开仓库打上 `v0.1.0`

### 部署到 Docker 服务器

使用以下 tag：

```bash
git tag deploy-prod-v0.1.0
git push origin deploy-prod-v0.1.0
```

触发后会：

1. 构建后端镜像 `ghcr.io/<namespace>/basaltpass-backend:0.1.0`
2. 构建前端镜像 `ghcr.io/<namespace>/basaltpass-frontend:0.1.0`
3. 推送到 GHCR
4. 通过 SSH 登录你的 Docker 服务器
5. 执行 `docker compose pull && docker compose up -d --remove-orphans`
6. 最长等待约 6 分钟，轮询 `http://127.0.0.1:5104/health`；如果启动期短暂返回 `502`，工作流会继续重试，只有超时后才判定失败并输出容器状态与日志

## 公开版过滤规则

`.release-sync-ignore` 用来控制哪些文件不要进入开放版仓库。

你应该重点检查是否需要排除：

- 私有说明文档
- 内部脚本
- 仅开发环境使用的配置
- 仅你自己服务器使用的部署信息

## 注意事项

- 公开版同步现在采用“快照同步”，不会把 `BasaltPassDev` 的私有提交历史原样暴露到公开仓库
- 当前部署流程默认拉取 `deploy/docker-compose.prod.yml`
- 服务器上的生产环境变量保存在 `${DEPLOY_PATH}/.env`
- 如果你后面要分测试环境和正式环境，建议再加 `deploy-staging-vX.Y.Z` 工作流
