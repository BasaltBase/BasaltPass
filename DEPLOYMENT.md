# BasaltPass 部署说明

BasaltPass 是本工作区所有业务项目的统一认证服务。必须先部署 BasaltPass，再部署其他业务项目。

## 1. 部署目标

- Backend API: `8101`
- 前端生产映射: `5104`
- 建议镜像:
  - `ghcr.io/<owner>/basaltpass-backend:<tag>`
  - `ghcr.io/<owner>/basaltpass-frontend:<tag>`

本仓库已经包含:

- `backend.Dockerfile`
- `frontend.Dockerfile`
- `deploy/docker-compose.prod.yml`
- `deploy/.env.prod.example`
- 工作区级 SOP: `../GITHUB_ACTIONS_GHCR_AUTO_DEPLOY_SOP.md`

## 2. GHCR 自动部署方式

建议使用 Tag 驱动生产部署:

1. GitHub Actions 构建前后端镜像
2. 推送到 GHCR
3. 通过 SSH 登录服务器
4. 上传 `deploy/docker-compose.prod.yml`
5. 服务器执行:

```bash
docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker compose pull
docker compose up -d --remove-orphans
```

建议镜像变量:

```env
BACKEND_IMAGE=ghcr.io/<owner>/basaltpass-backend:<tag>
FRONTEND_IMAGE=ghcr.io/<owner>/basaltpass-frontend:<tag>
```

## 3. 服务器准备

服务器目录建议固定为:

```bash
/opt/basaltpass
```

将 `deploy/.env.prod.example` 复制为服务器实际使用的 `.env`:

```env
JWT_SECRET=<long-random-secret>
BASALTPASS_ENV=production
BASALTPASS_SERVER_ADDRESS=:8101
BASALTPASS_CORS_ALLOW_ORIGINS=https://auth.example.com,https://admin.example.com
```

如需邮件能力，继续补齐 SMTP 或 SES 相关变量。

## 4. 生产编排

`deploy/docker-compose.prod.yml` 已经使用:

- `${BACKEND_IMAGE}`
- `${FRONTEND_IMAGE}`
- `.env`

标准部署命令:

```bash
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d --remove-orphans
```

## 5. 提供给下游项目的线上地址

建议统一暴露:

- BasaltPass 站点: `https://auth.example.com`
- Discovery: `https://auth.example.com/api/v1/.well-known/openid-configuration`
- OAuth authorize: `https://auth.example.com/api/v1/oauth/authorize`
- OAuth token: `https://auth.example.com/api/v1/oauth/token`
- OAuth userinfo: `https://auth.example.com/api/v1/oauth/userinfo`
- OAuth jwks: `https://auth.example.com/api/v1/oauth/jwks`
- OAuth introspect: `https://auth.example.com/api/v1/oauth/introspect`

## 6. 给其他项目接入时需要做的事

每个业务项目接入 BasaltPass 时，都要在 BasaltPass 内创建自己的 OAuth 客户端，必要时再创建 S2S 客户端。

常见配置项:

- `client_id`
- `client_secret`
- `redirect_uris`
- `scopes`
- `require_pkce`
- `grant_types`

## 7. 验收

- `https://auth.example.com/health` 正常
- `/.well-known/openid-configuration` 可返回
- 能在 BasaltPass 控制台创建 OAuth 客户端
- 下游项目能完成跳转登录和回调
