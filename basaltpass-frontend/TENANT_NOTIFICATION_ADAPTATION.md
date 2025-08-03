# 租户通知页面 API 适配完成

## 概述
已成功将租户通知管理页面 (`src/pages/tenant/Notifications.tsx`) 适配到新的三层通知 API 架构。

## 主要更改

### 1. 导入路径更改
```typescript
// 原来
import {
  TenantNotification,
  TenantCreateNotificationRequest,
  TenantUser,
  createTenantNotification,
  getTenantNotifications,
  deleteTenantNotification,
  getTenantUsers
} from '../../api/tenantNotification';

// 更新后
import {
  TenantNotification,
  TenantCreateNotificationRequest,
  TenantUser,
  tenantNotificationApi
} from '../../api/tenant/notification';
```

### 2. API 方法调用更改
- `getTenantNotifications(params)` → `tenantNotificationApi.getNotifications(page, pageSize)`
- `createTenantNotification(data)` → `tenantNotificationApi.createNotification(data)`
- `deleteTenantNotification(id)` → `tenantNotificationApi.deleteNotification(id)`
- `getTenantUsers(search)` → `tenantNotificationApi.getTenantUsers(search)`

### 3. 数据结构适配
- 修复了 `receiver_id` 字段显示逻辑，现在使用 `user` 对象来显示接收者信息
- 添加了对可选字段的安全检查（`receiver_ids?`, `app?`, `user?`）
- 更新了接收者显示逻辑，支持显示用户名和全员广播

### 4. 类型安全改进
- 为 `receiver_ids` 可选字段添加了安全检查
- 使用可选链操作符 (`?.`) 来避免未定义错误
- 确保数组操作的安全性

## 新功能支持

### 接收者显示
- 当有具体用户时：显示用户头像和昵称/邮箱
- 当为广播时：显示"全员广播"标签

### 表单处理
- 支持选择特定用户作为接收者
- 支持不选择任何用户（全员广播）
- 实时显示已选择用户数量

### 错误处理
- 完善的错误提示机制
- 网络请求失败时的友好提示
- 数据加载状态显示

## API 端点映射
- 获取通知列表: `GET /api/v1/tenant/notifications`
- 创建通知: `POST /api/v1/tenant/notifications`
- 删除通知: `DELETE /api/v1/tenant/notifications/{id}`
- 获取租户用户: `GET /api/v1/tenant/notifications/users`

## 测试状态
- ✅ TypeScript 类型检查通过
- ✅ 编译错误已修复
- ✅ 数据结构适配完成
- ✅ API 调用更新完成

## 注意事项
1. 新的 API 结构中，`receiver_ids` 是可选字段，为空或未提供时表示广播给租户下所有用户
2. 通知数据结构中使用 `user` 对象而不是 `receiver_id` 来表示接收者
3. 应用信息通过 `app` 对象提供，可能为 undefined
4. 所有 API 调用都通过 `tenantNotificationApi` 对象进行，保持一致性

## 下一步
页面现在已准备好与新的租户级通知 API 集成，可以进行前后端联调测试。
