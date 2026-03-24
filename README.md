# BasaltPass

多租户身份与权限平台，提供 OAuth2/OIDC、RBAC、租户隔离、S2S API 与多控制台管理能力。

## Overview

- **定位**：统一认证与授权中心（AuthN/AuthZ）
- **核心能力**：登录注册、OAuth2/OIDC、租户与角色权限管理、S2S 接口
- **运行形态**：后端 + 前端（user/tenant/admin）+ 文档站

## Repository Structure

```text
BasaltPass/
├─ basaltpass-backend/      # Go 后端
├─ basaltpass-frontend/     # React 前端（多控制台）
├─ basaltpass-docs/         # Docusaurus 文档站
├─ scripts/                 # 开发脚本
├─ docker-compose.yml       # 开发编排
├─ deploy/docker-compose.prod.yml
└─ README.md
```

## Quick Start

### Docker

```bash
cd BasaltPass
docker compose up -d --build
```

- Backend: `http://localhost:8101`
- Frontend（反向代理后）: `http://localhost:5104`

### Local Development

```bash
./scripts/dev.sh up
./scripts/dev.sh status
```

## Configuration

- 机密与易变配置：项目根 `.env`
- 稳定默认配置：`basaltpass-backend/config/config.yaml`
- 环境变量优先级高于配置文件

常用变量：

- `JWT_SECRET`
- `BASALTPASS_DATABASE_DRIVER`
- `BASALTPASS_DATABASE_PATH`
- OAuth / S2S 相关 client 配置

## Persistence Mounts

- 开发编排 `docker-compose.yml`：
  - `./data -> /data`
- 生产编排 `deploy/docker-compose.prod.yml`：
  - `../data -> /data`（相对 `deploy/`）

## Documentation

BasaltPass 已使用 Docusaurus 文档站：`basaltpass-docs/`。

- 本地预览：

```bash
cd basaltpass-docs
npm install
npm run start
```

- GitHub Pages 部署：`BasaltPass/.github/workflows/deploy-docs.yml`

## Testing

```bash
# 示例
cd basaltpass-backend
go test ./...
```

## Deployment

- 推荐生产环境使用独立数据库与缓存
- 启用 HTTPS、审计日志、限流
- 通过 CI/CD（含镜像与文档部署）发布

---

更多集成指南请访问文档站。