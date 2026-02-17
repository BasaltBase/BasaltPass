---
sidebar_position: 4
---

# 高层架构 (High-Level Architecture)

BasaltPass 被设计为一个中心化的身份提供商 (IdP)，在用户、客户端 (Apps) 和资源服务器 (APIs) 之间进行协调。

## 组件

1.  **授权服务器 (Authorization Server)**: 用户认证成功后颁发令牌。
2.  **用户数据库**: 存储用户凭证、个人资料和角色分配。
3.  **租户控制台 (Tenant Console)**: 组织管理员的界面。
4.  **管理控制台 (Admin Console)**: 平台运维人员的界面。
5.  **用户控制台 (User Console)**: 终端用户的自助个人资料管理。

## 请求流程

1.  **用户** 尝试访问 **客户端应用**。
2.  **客户端应用** 将 **用户** 重定向到 **BasaltPass**。
3.  **BasaltPass** 对 **用户** 进行认证 (展示登录表单)。
4.  **BasaltPass** 向 **客户端应用** 颁发 **授权码 (Authorization Code)**。
5.  **客户端应用** 使用授权码交换 **访问令牌 (Access Token)**。
6.  **客户端应用** 使用 **访问令牌** 调用 **资源 API**。
