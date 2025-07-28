# TenantLayout 租户控制面板

TenantLayout 是为租户用户提供的专门控制面板布局组件，与 AdminLayout 类似，但面向租户级别的管理需求。

## 功能特性

### 🎨 设计特点
- **蓝色主题**: 使用蓝色调区分于管理员面板的紫色主题
- **租户专属**: 专为租户级别的管理功能设计
- **响应式设计**: 支持桌面端和移动端
- **一致体验**: 保持与 AdminLayout 相似的交互体验

### 🚀 核心功能
- **侧边导航**: 租户专属的导航菜单
- **用户管理**: 用户头像、下拉菜单
- **面板切换**: 支持在租户、管理员、用户面板间切换
- **通知系统**: 租户级别的通知管理
- **移动适配**: 移动端折叠菜单

## 文件结构

```
src/components/
├── TenantLayout.tsx       # 租户布局组件
└── TenantNavigation.tsx   # 租户导航组件

src/pages/tenant/
├── Dashboard.tsx          # 租户仪表板
└── Apps.tsx              # 租户应用管理
```

## 导航结构

### 主要功能模块
1. **仪表板** - 租户概览和统计
2. **应用管理** - 应用、用户、角色、API密钥
3. **订阅管理** - 订阅、套餐升级、账单
4. **服务管理** - 服务实例、监控、配置
5. **钱包管理** - 余额、充值、消费记录
6. **系统管理** - 通知、日志、安全、设置

### 路由配置
- `/tenant/dashboard` - 租户仪表板
- `/tenant/apps` - 应用管理
- `/tenant/users` - 用户管理
- `/tenant/subscriptions` - 订阅管理
- `/tenant/wallet` - 钱包管理
- `/tenant/settings` - 租户设置

## 使用方式

### 基础用法
```tsx
import TenantLayout from '../../components/TenantLayout'

export default function TenantPage() {
  return (
    <TenantLayout title="页面标题">
      <div>
        {/* 页面内容 */}
      </div>
    </TenantLayout>
  )
}
```

### 带操作按钮
```tsx
import TenantLayout from '../../components/TenantLayout'

export default function TenantPage() {
  const actions = (
    <button className="bg-blue-600 text-white px-4 py-2 rounded">
      创建新项目
    </button>
  )

  return (
    <TenantLayout title="页面标题" actions={actions}>
      <div>
        {/* 页面内容 */}
      </div>
    </TenantLayout>
  )
}
```

## 组件属性

### TenantLayout Props
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| children | ReactNode | - | 页面内容 |
| title | string | - | 页面标题 |
| actions | ReactNode | - | 头部操作按钮 |

## 面板切换功能

TenantLayout 提供了便捷的面板切换功能：

1. **切换到管理员面板**: 链接到 `/admin/dashboard`
2. **切换到用户面板**: 链接到 `/dashboard`

这些切换按钮会根据当前路径智能显示。

## 样式主题

### 颜色方案
- **主色调**: 蓝色 (`blue-600`)
- **悬停效果**: 深蓝色 (`blue-700`)
- **选中状态**: 浅蓝色背景 (`blue-100`)
- **文字颜色**: 深蓝色 (`blue-900`)

### 视觉识别
- **Logo标识**: 字母 "T" (Tenant)
- **标题**: "租户控制台"
- **布局风格**: 与 AdminLayout 保持一致的结构

## 开发示例

已实现的示例页面：

### 1. 租户仪表板 (`/tenant/dashboard`)
- 统计卡片显示
- 快速操作入口
- 最近活动列表
- 租户状态概览

### 2. 租户应用管理 (`/tenant/apps`)
- 应用列表展示
- 应用状态管理
- 操作按钮集合
- 统计数据展示

## 扩展开发

要添加新的租户页面：

1. **创建页面组件**
```tsx
// src/pages/tenant/NewPage.tsx
import TenantLayout from '../../components/TenantLayout'

export default function NewPage() {
  return (
    <TenantLayout title="新页面">
      {/* 页面内容 */}
    </TenantLayout>
  )
}
```

2. **添加路由配置**
```tsx
// src/router.tsx
import NewPage from './pages/tenant/NewPage'

// 在路由中添加
<Route path="/tenant/new-page" element={
  <ProtectedRoute>
    <NewPage />
  </ProtectedRoute>
} />
```

3. **更新导航菜单**
```tsx
// src/components/TenantNavigation.tsx
// 在 navigation 数组中添加新的菜单项
{ name: '新功能', href: '/tenant/new-page', icon: NewIcon }
```

## 注意事项

1. **权限控制**: 所有租户路由都应使用 `ProtectedRoute` 包装
2. **主题一致性**: 保持蓝色主题的一致性
3. **响应式适配**: 确保新页面在移动端正常显示
4. **用户体验**: 保持与现有页面相似的交互模式

## 与 AdminLayout 的区别

| 特性 | TenantLayout | AdminLayout |
|------|--------------|-------------|
| 主题色 | 蓝色 | 紫色/靛蓝色 |
| Logo标识 | "T" | "B" |
| 标题 | "租户控制台" | "BasaltPass" |
| 目标用户 | 租户管理员 | 平台管理员 |
| 功能范围 | 租户级管理 | 平台级管理 |
| 切换面板 | 管理员/用户 | 租户/用户 |

TenantLayout 为租户提供了完整的控制面板体验，是多租户系统架构中的重要组成部分。
