# BasaltPass 统一组件系统

## 概述

为了统一整个 BasaltPass 应用的 UI 样式，我们创建了 P-Input 和 P-Button 两个核心组件，用于替代全局的输入框和按钮。

## 组件特性

### P-Input 组件

统一的输入框组件，提供一致的样式和交互体验。

#### 主要特性
- 🎨 **多种变体**: default（默认）、rounded（圆角）、minimal（简约）
- 📏 **多种尺寸**: sm（小）、md（中）、lg（大）
- 🔒 **密码切换**: 内置密码显示/隐藏功能
- 🖼️ **图标支持**: 支持左侧图标显示
- ❌ **错误状态**: 内置错误信息显示
- ♿ **无障碍支持**: 完整的标签和 ARIA 支持

#### 使用示例

```tsx
import { PInput } from '../components';

// 基础用法
<PInput 
  label="用户名"
  placeholder="请输入用户名"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>

// 密码输入框
<PInput 
  type="password"
  label="密码"
  placeholder="请输入密码"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  showPassword={showPassword}
  onTogglePassword={() => setShowPassword(!showPassword)}
/>

// 带图标的输入框
<PInput 
  label="邮箱"
  placeholder="user@example.com"
  icon={<EnvelopeIcon />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// 不同变体
<PInput variant="rounded" label="圆角输入框" />
<PInput variant="minimal" label="简约输入框" />

// 错误状态
<PInput 
  label="验证码"
  error="验证码不正确"
  value={code}
  onChange={(e) => setCode(e.target.value)}
/>
```

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| label | string \| ReactNode | - | 输入框标签 |
| error | string | - | 错误信息 |
| icon | ReactNode | - | 左侧图标 |
| showPassword | boolean | - | 密码是否显示 |
| onTogglePassword | () => void | - | 密码切换回调 |
| variant | 'default' \| 'rounded' \| 'minimal' | 'default' | 样式变体 |
| size | 'sm' \| 'md' \| 'lg' | 'md' | 尺寸 |

### P-Button 组件

统一的按钮组件，提供多种样式和状态。

#### 主要特性
- 🎨 **多种变体**: primary（主要）、secondary（次要）、danger（危险）、ghost（幽灵）、gradient（渐变）
- 📏 **多种尺寸**: sm（小）、md（中）、lg（大）
- ⏳ **加载状态**: 内置加载动画
- 🖼️ **图标支持**: 支持左右图标
- 📱 **响应式**: 支持全宽显示
- ♿ **无障碍支持**: 完整的键盘和屏幕阅读器支持

#### 使用示例

```tsx
import { PButton } from '../components';

// 基础用法
<PButton variant="primary">
  确认
</PButton>

// 加载状态
<PButton variant="primary" loading>
  提交中...
</PButton>

// 带图标
<PButton 
  variant="secondary"
  leftIcon={<UserIcon className="h-4 w-4" />}
>
  添加用户
</PButton>

// 全宽按钮
<PButton variant="primary" fullWidth>
  登录
</PButton>

// 不同尺寸
<PButton size="sm">小按钮</PButton>
<PButton size="md">中按钮</PButton>
<PButton size="lg">大按钮</PButton>

// 不同变体
<PButton variant="primary">主要按钮</PButton>
<PButton variant="secondary">次要按钮</PButton>
<PButton variant="danger">危险按钮</PButton>
<PButton variant="ghost">幽灵按钮</PButton>
<PButton variant="gradient">渐变按钮</PButton>
```

#### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| variant | 'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'gradient' | 'primary' | 按钮变体 |
| size | 'sm' \| 'md' \| 'lg' | 'md' | 按钮尺寸 |
| loading | boolean | false | 加载状态 |
| leftIcon | ReactNode | - | 左侧图标 |
| rightIcon | ReactNode | - | 右侧图标 |
| fullWidth | boolean | false | 是否全宽 |

## 迁移指南

### 从旧的输入框迁移

**旧代码：**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">
    邮箱地址
  </label>
  <input
    type="email"
    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
    placeholder="请输入邮箱地址"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>
```

**新代码：**
```tsx
<PInput
  type="email"
  label="邮箱地址"
  placeholder="请输入邮箱地址"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### 从旧的按钮迁移

**旧代码：**
```tsx
<button
  type="submit"
  disabled={isLoading}
  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? '登录中...' : '登录'}
</button>
```

**新代码：**
```tsx
<PButton
  type="submit"
  variant="gradient"
  fullWidth
  loading={isLoading}
>
  登录
</PButton>
```

## 已更新的页面

以下页面已经更新为使用新的组件系统：

### 认证页面
- ✅ `/pages/auth/Login.tsx` - 登录页面
- ✅ `/pages/auth/Register.tsx` - 注册页面

### 用户安全设置
- ✅ `/pages/user/security/SecuritySettings.tsx` - 密码修改和联系信息表单

### 管理员页面
- ✅ `/pages/admin/user/Users.tsx` - 用户管理（部分）

## 设计原则

### 颜色系统
- **Primary（主要）**: Indigo 色系 - 用于主要操作
- **Secondary（次要）**: Gray 色系 - 用于次要操作
- **Danger（危险）**: Red 色系 - 用于删除等危险操作
- **Ghost（幽灵）**: 透明背景 - 用于轻量操作
- **Gradient（渐变）**: Blue to Indigo - 用于特殊强调

### 尺寸规范
- **Small (sm)**: 适用于紧凑空间
- **Medium (md)**: 默认尺寸，适用于大多数场景
- **Large (lg)**: 适用于重要操作或宽松布局

### 交互状态
- **Hover**: 悬停效果
- **Focus**: 键盘焦点指示
- **Active**: 点击活动状态
- **Disabled**: 禁用状态
- **Loading**: 加载状态

## 后续工作

1. **继续迁移页面**：逐步将其他页面的输入框和按钮替换为新组件
2. **主题系统**：考虑添加深色模式支持
3. **更多组件**：创建其他统一组件，如 P-Select、P-Checkbox 等
4. **文档完善**：添加更多使用示例和最佳实践
5. **测试覆盖**：为组件添加单元测试

## 最佳实践

1. **优先使用新组件**：在新开发的功能中优先使用 P-Input 和 P-Button
2. **保持一致性**：在同一个表单中使用相同的变体和尺寸
3. **语义化使用**：根据操作的重要性选择合适的按钮变体
4. **无障碍考虑**：确保提供适当的标签和描述文本
5. **性能优化**：避免在渲染函数中创建新的图标组件实例

## 支持

如果在使用过程中遇到问题或有改进建议，请联系开发团队或在项目仓库中提出 Issue。
