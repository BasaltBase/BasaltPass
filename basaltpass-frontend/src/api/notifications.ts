// 分级通知API导出
// 根据用户权限级别导入对应的API

// 管理员级别API
export * as AdminNotificationAPI from './admin'

// 租户级别API  
export * as TenantNotificationAPI from './tenant'

// 用户级别API
export * as UserNotificationAPI from './user'

// 兼容性导出 - 保持向后兼容
export { adminNotificationApi } from './admin/notification'
export { tenantNotificationApi } from './tenant/notification'  
export { userNotificationApi } from './user/notification'
