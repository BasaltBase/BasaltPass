# BasaltPass 文档

这里是 BasaltPass 的**唯一官方文档入口**（开发文档 + 用户/API 文档）。

- 开发文档：面向维护者/二次开发者，包含架构、配置、开发与调试、部署要点。
- 用户/API 文档：面向 API 使用者/集成方，包含鉴权方式、常见流程与端点索引。

## 快速导航

- 开发文档入口：./developer/README.md
- 用户/API 文档入口：./user/README.md

## API 索引（自动/半自动）

- 路由总表（自动导出，**请勿手改**）：./ROUTES.md
- OpenAPI（草案，可能不完全覆盖所有端点）：./reference/openapi.yaml

## 文档维护约定

1. **不要**在 ./ROUTES.md 里手写说明：该文件在 develop 环境启动后端时会自动导出覆盖。
2. 面向用户的接口说明写在 ./user 下；面向开发者的实现/调试说明写在 ./developer 下。
3. 文档示例统一使用：
   - Base URL：`http://localhost:8080`
   - Header：`Authorization: Bearer <access_token>`
   - JSON：UTF-8

> 如果你发现接口行为与文档不一致，优先以实际后端实现为准，并在文档中补充「当前行为」与「计划兼容/迁移」说明。
