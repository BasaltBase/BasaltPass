# AdminDashboard 功能说明

## 概述

AdminDashboard是BasaltPass管理控制台的首页，为管理员提供系统概览和快速操作入口。

## 功能特性

### 1. 仪表板统计
- **用户统计**: 总用户数、活跃用户数和活跃率
- **钱包统计**: 钱包总数和今日收入
- **收入统计**: 总收入和今日收入对比
- **订阅统计**: 总订阅数、活跃订阅数和活跃率

### 2. 快速操作
提供6个主要管理功能的快捷入口：
- 用户管理 - 查看和管理系统用户
- 钱包管理 - 查看用户钱包和交易
- 订阅管理 - 管理用户订阅和计费
- 应用管理 - 管理租户应用配置
- 产品管理 - 管理产品和套餐
- 审计日志 - 查看系统操作日志

### 3. 最近活动
显示系统最近的操作活动，包括：
- 用户注册
- 钱包交易（充值/提现）
- 订阅创建
- 应用创建
- 其他系统操作

### 4. 系统状态
显示当前系统运行状态：
- 系统可用性
- 应用总数
- 待处理任务
- 服务状态

## 技术实现

### 前端组件
- **文件位置**: `basaltpass-frontend/src/pages/admin/Dashboard.tsx`
- **路由配置**: `/admin` 和 `/admin/dashboard`
- **布局**: 使用AdminLayout组件
- **样式**: Tailwind CSS + Heroicons

### 后端API
新增了两个API端点：
- **GET /api/v1/admin/dashboard/stats** - 获取仪表板统计数据
- **GET /api/v1/admin/dashboard/activities** - 获取最近活动记录

### API函数
在 `basaltpass-backend/internal/admin/handler.go` 中新增：
- `DashboardStatsHandler` - 统计数据处理函数
- `RecentActivitiesHandler` - 最近活动处理函数

### 前端API调用
在 `basaltpass-frontend/src/api/admin.ts` 中新增：
- `getDashboardStats()` - 获取统计数据
- `getRecentActivities()` - 获取最近活动

## 路由配置

更新了以下文件的路由配置：
- `basaltpass-frontend/src/router.tsx` - 添加AdminDashboard路由
- `basaltpass-frontend/src/components/AdminNavigation.tsx` - 更新仪表板链接
- `basaltpass-backend/internal/api/router.go` - 添加API路由

## 权限控制

AdminDashboard需要管理员权限访问：
- 前端使用`AdminLayout`组件和`ProtectedRoute`保护
- 后端API使用`AdminMiddleware()`中间件验证权限

## 数据来源

统计数据从以下数据表获取：
- `users` - 用户统计
- `wallets` - 钱包统计 
- `wallet_txs` - 交易和收入统计
- `subscriptions` - 订阅统计
- `audit_logs` - 活动记录

## 测试

创建了测试脚本 `test/test_admin_dashboard.ps1` 用于测试API功能。

## 使用方法

1. 启动后端服务
2. 启动前端服务
3. 以管理员身份登录
4. 访问 `/admin` 或 `/admin/dashboard` 路径

## 注意事项

- 当API调用失败时，会使用模拟数据作为降级方案
- 需要确保用户具有管理员角色权限
- 统计数据会实时从数据库获取
- 时间显示使用相对时间格式（如"2分钟前"）

## 后续优化建议

1. 添加数据缓存机制提高性能
2. 支持更多统计维度和图表展示
3. 添加数据刷新和实时更新功能
4. 支持自定义仪表板配置
5. 添加数据导出功能
