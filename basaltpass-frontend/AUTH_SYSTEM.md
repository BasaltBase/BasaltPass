# BasaltPass 认证保护系统

## 概述

本系统实现了完整的用户认证保护机制，确保用户在token不存在或无效时自动跳转到登录界面，同时防止已登录用户访问登录/注册页面。

## 核心组件

### 1. AuthContext (认证上下文)
**文件**: `src/contexts/AuthContext.tsx`

- **功能**: 全局管理用户认证状态
- **特性**:
  - 自动检查token有效性
  - 提供登录/登出方法
  - 管理用户信息状态
  - 处理token失效情况

### 2. ProtectedRoute (受保护路由)
**文件**: `src/components/ProtectedRoute.tsx`

- **功能**: 保护需要认证的页面
- **特性**:
  - 检查用户是否已认证
  - 未认证用户自动跳转到登录页
  - 显示加载状态

### 3. PublicRoute (公共路由)
**文件**: `src/components/PublicRoute.tsx`

- **功能**: 处理公共页面（登录/注册）
- **特性**:
  - 已登录用户自动跳转到仪表板
  - 防止已认证用户访问登录页面

### 4. API客户端拦截器
**文件**: `src/api/client.ts`

- **功能**: 自动处理API请求认证
- **特性**:
  - 自动添加Authorization头
  - 处理401错误自动跳转
  - 清除无效token

## 路由保护配置

### 受保护的页面（需要登录）
所有主要功能页面都使用`ProtectedRoute`保护：

```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

**受保护的页面包括**:
- `/dashboard` - 仪表板
- `/profile` - 个人资料
- `/teams/*` - 团队相关页面
- `/wallet/*` - 钱包相关页面
- `/security/*` - 安全设置
- `/admin/*` - 管理员页面
- `/subscriptions/*` - 订阅相关页面
- `/orders/*` - 订单相关页面

### 公共页面（已登录用户不能访问）
登录和注册页面使用`PublicRoute`保护：

```tsx
<Route path="/login" element={
  <PublicRoute>
    <Login />
  </PublicRoute>
} />
```

**公共页面包括**:
- `/login` - 登录页面
- `/register` - 注册页面

## 认证流程

### 1. 用户访问受保护页面
```
用户访问 /dashboard
    ↓
ProtectedRoute检查认证状态
    ↓
未认证 → 跳转到 /login
已认证 → 显示页面内容
```

### 2. 用户访问登录页面
```
用户访问 /login
    ↓
PublicRoute检查认证状态
    ↓
已认证 → 跳转到 /dashboard
未认证 → 显示登录页面
```

### 3. Token失效处理
```
API请求返回401错误
    ↓
客户端拦截器检测到401
    ↓
清除本地token
    ↓
跳转到登录页面
```

## 使用方法

### 在组件中使用认证状态

```tsx
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <div>请先登录</div>
  }
  
  return (
    <div>
      <p>欢迎, {user?.nickname}</p>
      <button onClick={logout}>退出登录</button>
    </div>
  )
}
```

### 添加新的受保护页面

```tsx
// 在router.tsx中添加
<Route path="/new-page" element={
  <ProtectedRoute>
    <NewPage />
  </ProtectedRoute>
} />
```

### 添加新的公共页面

```tsx
// 在router.tsx中添加
<Route path="/public-page" element={
  <PublicRoute>
    <PublicPage />
  </PublicRoute>
} />
```

## 测试方法

### 1. 测试未登录状态
1. 清除浏览器本地存储
2. 访问任何受保护页面（如 `/dashboard`）
3. 应该自动跳转到登录页面

### 2. 测试已登录状态
1. 正常登录系统
2. 访问登录页面（`/login`）
3. 应该自动跳转到仪表板

### 3. 测试Token失效
1. 手动设置无效token到localStorage
2. 刷新页面或访问受保护页面
3. 应该自动跳转到登录页面

### 4. 使用测试页面
访问 `test-auth.html` 进行自动化测试

## 安全特性

1. **自动Token验证**: 每次访问受保护页面都会验证token有效性
2. **自动跳转**: 根据认证状态自动跳转到合适页面
3. **Token清理**: 检测到无效token时自动清除
4. **防止重复登录**: 已登录用户无法访问登录页面
5. **API拦截**: 所有API请求自动处理认证头

## 注意事项

1. **组件嵌套顺序**: AuthProvider必须在BrowserRouter内部
2. **路由配置**: 确保所有需要保护的页面都使用ProtectedRoute
3. **API错误处理**: 401错误会自动处理，无需手动处理
4. **状态管理**: 使用AuthContext统一管理认证状态

## 故障排除

### 常见问题

1. **useNavigate错误**: 确保AuthProvider在BrowserRouter内部
2. **无限重定向**: 检查路由配置是否正确
3. **Token不更新**: 确保使用AuthContext的login方法
4. **页面不跳转**: 检查ProtectedRoute/PublicRoute配置

### 调试方法

1. 检查浏览器控制台错误信息
2. 查看localStorage中的access_token
3. 使用test-auth.html进行测试
4. 检查网络请求的Authorization头 