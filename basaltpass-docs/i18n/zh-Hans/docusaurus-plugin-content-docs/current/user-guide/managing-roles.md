---
sidebar_position: 3
---

# 角色与权限管理 (Managing Roles & Permissions)

BasaltPass 使用灵活的 **RBAC (基于角色的访问控制)** 系统。

## 概念

-   **权限 (Permission)**: 执行操作的具体权利 (例如 `article.create`).
-   **角色 (Role)**: 一组权限的命名集合 (例如 `Editor`).

## 检查权限

您可以使用 Check API 验证用户是否具有特定访问权限。这对于调试或集成后端非常有用。

**API**: `POST /api/v1/tenant/permissions/check`

```json
{
  "user_id": 123,
  "permission_codes": ["article.create", "article.delete"]
}
```

**响应**:
```json
{
  "permissions": {
    "article.create": true,
    "article.delete": false
  }
}
```

## 导入权限

要初始化您的系统，您可以批量导入权限和角色。

**API**: `POST /api/v1/tenant/permissions/import`
-   **输入**: JSON 数组或文本文件。
-   **特性**: 自动去重并标准化 (小写) 代码。

## 最佳实践

1.  **细粒度权限**: 基于资源操作定义权限 (`resource.action`)。
2.  **复合角色**: 创建将逻辑权限集分组的角色。
3.  **最小权限**: 仅分配用户工作所需的最小角色。
