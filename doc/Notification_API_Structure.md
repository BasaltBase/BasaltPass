# 分级通知API文档

## 目录结构

```
src/api/
├── admin/
│   ├── index.ts
│   └── notification.ts          # 管理员级通知API
├── tenant/
│   ├── index.ts
│   └── notification.ts          # 租户级通知API
├── user/
│   ├── index.ts
│   └── notification.ts          # 用户级通知API
├── notifications.ts             # 统一导出文件
└── notification.ts              # 原有文件（保持兼容）
```

## API分级说明

### 1. 管理员级API (`/api/admin/notification.ts`)

**权限范围**: 系统超级管理员
**功能特点**:
- 全站通知管理
- 跨租户操作
- 完整的用户和租户管理
- 高级统计功能

**主要功能**:
```typescript
// 创建全站通知
adminNotificationApi.createNotification({
  app_name: "系统通知",
  title: "系统维护通知",
  content: "系统将进行维护",
  type: "warning",
  receiver_ids: [], // 全站广播
  tenant_ids: [1, 2] // 指定租户
})

// 获取全站通知统计
const stats = await adminNotificationApi.getNotificationStats()
```

### 2. 租户级API (`/api/tenant/notification.ts`)

**权限范围**: 租户管理员
**功能特点**:
- 租户内通知管理
- 租户用户管理
- 租户应用选择
- 租户级统计

**主要功能**:
```typescript
// 创建租户通知
tenantNotificationApi.createNotification({
  app_name: "租户应用",
  title: "租户通知",
  content: "发送给租户用户",
  type: "info",
  receiver_ids: [1, 2, 3] // 租户内用户
})

// 获取租户用户列表
const users = await tenantNotificationApi.getTenantUsers("搜索关键词")
```

### 3. 用户级API (`/api/user/notification.ts`)

**权限范围**: 普通用户
**功能特点**:
- 个人通知管理
- 通知设置和偏好
- 已读/未读管理
- 重要通知标记

**主要功能**:
```typescript
// 获取用户通知
const notifications = await userNotificationApi.getNotifications(1, 20, {
  is_read: false,
  type: "important"
})

// 更新通知设置
await userNotificationApi.updateNotificationSettings({
  email_enabled: true,
  quiet_hours_enabled: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00"
})
```

## 使用示例

### 1. 按权限级别导入

```typescript
// 管理员使用
import { adminNotificationApi } from '@/api/admin'

// 租户管理员使用
import { tenantNotificationApi } from '@/api/tenant'

// 普通用户使用
import { userNotificationApi } from '@/api/user'
```

### 2. 统一导入

```typescript
// 统一导入所有API
import { 
  AdminNotificationAPI,
  TenantNotificationAPI, 
  UserNotificationAPI
} from '@/api/notifications'

// 或者单独导入
import { 
  adminNotificationApi,
  tenantNotificationApi,
  userNotificationApi 
} from '@/api/notifications'
```

### 3. 动态权限使用

```typescript
// 根据用户权限动态选择API
const getNotificationApi = (userRole: string) => {
  switch (userRole) {
    case 'admin':
      return adminNotificationApi
    case 'tenant_admin':
      return tenantNotificationApi
    default:
      return userNotificationApi
  }
}

const api = getNotificationApi(currentUser.role)
const notifications = await api.getNotifications()
```

## 接口对比

| 功能 | 管理员API | 租户API | 用户API |
|------|-----------|---------|---------|
| 创建通知 | ✅ 全站 | ✅ 租户内 | ❌ |
| 查看通知 | ✅ 全部 | ✅ 租户相关 | ✅ 个人 |
| 删除通知 | ✅ 全部 | ✅ 租户相关 | ✅ 个人 |
| 统计信息 | ✅ 全站统计 | ✅ 租户统计 | ❌ |
| 用户管理 | ✅ 全部用户 | ✅ 租户用户 | ❌ |
| 通知设置 | ❌ | ❌ | ✅ |
| 重要标记 | ❌ | ❌ | ✅ |

## 数据模型差异

### 管理员通知模型
```typescript
interface AdminNotification {
  // 包含租户信息
  tenant_id: number
  tenant_name: string
  // 完整用户信息
  user: { id, email, nickname, tenant }
  // 系统级应用信息
  app: { id, name, tenant_id }
}
```

### 租户通知模型
```typescript
interface TenantNotification {
  // 不包含租户信息（固定为当前租户）
  // 租户内用户信息
  user: { id, email, nickname }
  // 租户内应用信息
  app: { id, name }
}
```

### 用户通知模型
```typescript
interface UserNotification {
  // 最简化的通知信息
  // 只包含必要的显示字段
  is_important: boolean // 用户专有字段
  read_at: string // 阅读时间
}
```

## 安全性说明

1. **权限隔离**: 每个级别的API只能访问对应权限范围的数据
2. **数据过滤**: 后端会根据用户权限自动过滤返回数据
3. **操作限制**: 用户只能对自己有权限的通知进行操作
4. **多租户安全**: 租户级API确保数据不会跨租户泄露

## 迁移指南

从原有 `notification.ts` 迁移到分级API：

```typescript
// 原有方式
import { notificationApi } from '@/api/notification'

// 新方式 - 根据用户角色选择
import { userNotificationApi } from '@/api/user'
import { tenantNotificationApi } from '@/api/tenant' 
import { adminNotificationApi } from '@/api/admin'
```

原有的 `notification.ts` 文件保持不变，确保向后兼容。
