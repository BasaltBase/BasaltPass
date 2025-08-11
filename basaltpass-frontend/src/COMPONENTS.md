# BasaltPass 组件库文档

## 概述

BasaltPass 组件库提供了一套统一、可访问、类型安全的 React 组件，基于 Tailwind CSS 设计系统构建。

## 组件列表

### 1. PInput - 输入框组件

统一的输入框组件，支持多种变体和交互状态。

#### 属性接口

```tsx
interface PInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'filled' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}
```

#### 使用示例

```tsx
// 基础输入框
<PInput
  type="email"
  placeholder="输入邮箱地址"
  variant="default"
  size="md"
/>

// 带图标的输入框
<PInput
  type="text"
  placeholder="搜索用户"
  leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
  variant="filled"
/>

// 密码输入框
<PInput
  type="password"
  placeholder="输入密码"
  showPassword={showPassword}
  onTogglePassword={() => setShowPassword(!showPassword)}
  error={errors.password}
/>
```

#### 变体说明

- **default**: 标准边框样式
- **filled**: 填充背景样式
- **underline**: 下划线样式

---

### 2. PButton - 按钮组件

功能丰富的按钮组件，支持多种样式变体和交互状态。

#### 属性接口

```tsx
interface PButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

#### 使用示例

```tsx
// 基础按钮
<PButton variant="primary" size="md">
  确认
</PButton>

// 带图标的按钮
<PButton
  variant="secondary"
  leftIcon={<PlusIcon className="h-5 w-5" />}
>
  添加用户
</PButton>

// 加载状态按钮
<PButton
  variant="primary"
  loading={isSubmitting}
  disabled={isSubmitting}
>
  {isSubmitting ? '提交中...' : '提交'}
</PButton>

// 全宽按钮
<PButton variant="gradient" fullWidth>
  登录
</PButton>
```

#### 变体说明

- **primary**: 主要操作按钮，蓝色主题
- **secondary**: 次要操作按钮，灰色主题
- **danger**: 危险操作按钮，红色主题
- **ghost**: 幽灵按钮，透明背景
- **gradient**: 渐变按钮，彩色渐变背景

---

### 3. PCheckbox - 复选框组件

多样化的复选框组件，支持不同的展示样式和交互模式。

#### 属性接口

```tsx
interface PCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string | React.ReactNode;
  description?: string;
  error?: string;
  variant?: 'default' | 'card' | 'switch';
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  labelPosition?: 'right' | 'left';
}
```

#### 使用示例

```tsx
// 基础复选框
<PCheckbox
  label="记住我"
  checked={rememberMe}
  onChange={(e) => setRememberMe(e.target.checked)}
/>

// 开关样式复选框
<PCheckbox
  variant="switch"
  label="启用双因素认证"
  description="增强账户安全性"
  checked={enabledTwoFA}
  onChange={(e) => setEnabledTwoFA(e.target.checked)}
/>

// 卡片样式复选框
<PCheckbox
  variant="card"
  size="lg"
  label="高级功能"
  description="解锁所有高级特性和工具"
  checked={hasAdvancedFeatures}
  onChange={(e) => setHasAdvancedFeatures(e.target.checked)}
/>

// 复杂标签复选框
<PCheckbox
  checked={!!checked[permission.ID]}
  onChange={() => togglePermission(permission.ID)}
  label={
    <div className="flex items-center gap-2">
      <span className="font-mono text-gray-800">{permission.Code}</span>
      <span className="text-gray-500">{permission.Description}</span>
    </div>
  }
/>

// 不确定状态复选框
<PCheckbox
  label="全选"
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  onChange={handleSelectAll}
/>
```

#### 变体说明

- **default**: 标准复选框样式
- **switch**: 开关切换样式
- **card**: 卡片容器样式，适合重要选项

#### 特殊功能

- **indeterminate**: 支持不确定状态，常用于全选/部分选中场景
- **ReactNode label**: 支持复杂标签内容，可以包含图标、格式化文本等
- **labelPosition**: 控制标签位置（左侧或右侧）

---

### 4. PToggle - 开关组件

专门的开关切换组件，提供现代化的切换体验。

#### 属性接口

```tsx
interface PToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string | React.ReactNode;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'right' | 'left';
}
```

#### 使用示例

```tsx
// 基础开关
<PToggle
  label="推送通知"
  checked={notifications}
  onChange={(e) => setNotifications(e.target.checked)}
/>

// 带描述的开关
<PToggle
  label="深色模式"
  description="启用深色主题界面"
  checked={darkMode}
  onChange={(e) => setDarkMode(e.target.checked)}
/>

// 不同尺寸
<PToggle
  size="lg"
  label="自动保存"
  description="每30秒自动保存您的工作"
  checked={autoSave}
  onChange={(e) => setAutoSave(e.target.checked)}
/>

// 标签位置控制
<PToggle
  label="高级设置"
  labelPosition="left"
  checked={advancedSettings}
  onChange={(e) => setAdvancedSettings(e.target.checked)}
/>

// 错误状态
<PToggle
  label="实验性功能"
  error="此功能当前不可用"
  checked={false}
  disabled
/>
```

#### 设计特点

- **专注开关体验**: 专门为开关切换场景设计，比复选框的switch变体更优化
- **流畅动画**: 平滑的切换动画和视觉反馈
- **一致的边框**: 与其他组件保持统一的边框宽度标准
- **灵活布局**: 支持标签左右位置调整

---

## 设计原则

### 一致性
- 所有组件遵循统一的 API 设计模式
- 使用一致的属性命名约定（variant, size, error 等）
- 统一的视觉风格和交互行为

### 可访问性
- 完整的键盘导航支持
- 适当的 ARIA 属性
- 屏幕阅读器友好
- 焦点管理和视觉指示

### 类型安全
- 完整的 TypeScript 类型定义
- 智能代码提示和自动完成
- 编译时类型检查
- 泛型支持确保类型推导

### 灵活性
- forwardRef 模式支持 ref 传递
- 扩展原生 HTML 属性
- 受控和非受控模式兼容
- 表单库集成友好

## 使用指南

### 安装导入

```tsx
// 单个组件导入
import { PInput } from '@/components';

// 多个组件导入
import { PInput, PButton, PCheckbox, PToggle } from '@/components';
```

### 表单集成

```tsx
// 基础表单示例
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enabledTwoFA, setEnabledTwoFA] = useState(false);

  return (
    <form onSubmit={handleSubmit}>
      <PInput
        type="email"
        placeholder="邮箱地址"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
        error={errors.email}
      />
      
      <PInput
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        error={errors.password}
      />
      
      <PCheckbox
        label="记住我"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
      />

      <PToggle
        label="启用双因素认证"
        description="增强账户安全性"
        checked={enabledTwoFA}
        onChange={(e) => setEnabledTwoFA(e.target.checked)}
      />
      
      <PButton
        type="submit"
        variant="primary"
        fullWidth
        loading={isLoading}
      >
        登录
      </PButton>
    </form>
  );
}
```

### 样式定制

组件基于 Tailwind CSS 构建，支持通过 className 属性进行样式定制：

```tsx
<PInput
  className="my-custom-input"
  // 其他属性...
/>
```

### 响应式设计

组件内置响应式支持，在不同屏幕尺寸下自动适配：

```tsx
// 在小屏幕上自动调整尺寸
<PButton size="sm" className="md:size-md lg:size-lg">
  响应式按钮
</PButton>
```

## 贡献指南

### 添加新组件

1. 在 `src/components/` 目录下创建新组件文件
2. 遵循现有的命名约定和 API 设计模式
3. 确保完整的 TypeScript 类型定义
4. 添加相应的文档和使用示例
5. 在 `src/components/index.ts` 中导出组件

### 组件开发规范

- 使用 forwardRef 模式支持 ref 传递
- 扩展相应的 HTML 元素属性接口
- 提供 variant 和 size 属性用于样式变体
- 支持 error 属性用于错误状态显示
- 确保可访问性和键盘导航支持
