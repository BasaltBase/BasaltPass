# 开发文档（Developer Docs）

这套文档用于：你自己维护 BasaltPass、以及其他开发者进行二次开发。

## 目录

- 快速开始与本地开发：./getting-started.md
- 仓库结构与模块边界：./repo-structure.md
- API 约定与返回格式：./api-conventions.md
- 配置体系（config.yaml / settings.yaml / env 覆盖）：./configuration.md
- 后端开发指南（路由/中间件/鉴权/数据库）：./backend.md
- 前端开发指南（多控制台 apps / 本地端口）：./frontend.md
- 应用/网站接入标准（如何做一个“符合 BasaltPass 标准”的集成）：./app-website-standard.md
- 第三方 App 端到端接入指南（CanShelf 实战版，面向集成方）：../user/third-party-app-integration.md
- OAuth2 / OIDC（授权服务器实现与调试）：./oauth2-oidc.md
- 权限系统（全局/Admin + 租户/Tenant + 应用/App）：./rbac.md
- 邮件系统（多 Provider + 测试工具）：./email.md

## 推荐阅读顺序

1. ./getting-started.md
2. ./configuration.md
3. ./backend.md 与 ./frontend.md
4. 根据你要改的模块继续深入（OAuth2/RBAC/Email）
