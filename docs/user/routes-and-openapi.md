# 端点索引（ROUTES 与 OpenAPI）

当你要“找接口有哪些”时，按以下顺序：

## 1) 路由总表（最全）

- `docs/ROUTES.md`

该文件在 develop 环境启动后端时自动导出（覆盖写入），只包含 Method 与 Path。

## 2) OpenAPI（可用于生成 SDK，但可能不全）

- `docs/reference/openapi.yaml`

目前该文件是草案级别：能帮你快速生成客户端骨架，但未必覆盖所有路由与字段。

## 3) 分类文档

本目录 ./ 下的文档提供：鉴权方式、常见流程、以及常用端点的可运行示例。
