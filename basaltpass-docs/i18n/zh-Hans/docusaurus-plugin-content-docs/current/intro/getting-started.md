---
sidebar_position: 3
---

# 快速开始 (Getting Started)

学习如何在本地运行 BasaltPass 进行开发和测试。

## 前置要求

-   Docker & Docker Compose
-   Git

## 方法 A: Docker Compose (最简单)

使用一条命令运行整个技术栈：

```bash
docker-compose up -d --build
```

-   **后端**: `http://localhost:8080`
-   **前端**: `http://localhost:3000` (查看 `docker-compose.yml` 确认确切端口)

## 方法 B: 开发脚本 (推荐)

对于积极开发，请使用提供的辅助脚本：

```bash
./scripts/dev.sh up
```

### 常用端口

| 服务 | 端口 | 描述 |
| :--- | :--- | :--- |
| **后端 (Backend)** | `8080` | API 服务器 |
| **用户控制台 (User Console)** | `5173` | 终端用户登录与个人资料 |
| **租户控制台 (Tenant Console)** | `5174` | 组织管理 |
| **管理控制台 (Admin Console)** | `5175` | 平台管理 |

## 配置

BasaltPass 通过以下方式配置：
1.  **.env 文件**: 用于机密信息和特定环境的变量。
2.  **config.yaml**: 默认系统配置。
3.  **环境变量**: 覆盖任何配置 (例如 `BASALTPASS_DB_HOST`)。

> **注意**: 在生产环境中务必设置 `JWT_SECRET`！
