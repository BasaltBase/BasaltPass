---
sidebar_position: 6
---

# 邮件模板

BasaltPass 允许您自定义发送给用户的邮件 (例如验证码、密码重置)。

## 模板格式

邮件使用 Go 的 `html/template` 引擎渲染。

## 自定义方式

目前，模板嵌入在后端二进制文件中以简化部署。如需自定义：

1.  **Fork 仓库**: 修改 `internal/email/templates/` 中的模板。
2.  **重新编译**: 使用您的修改重新编译后端。

## 可用变量

-   `{{.Code}}`: 验证码。
-   `{{.ExpiresIn}}`: 到期时间。
-   `{{.Link}}`: 操作链接 (如果适用)。
-   `{{.AppName}}`: 您的 BasaltPass 实例名称。
