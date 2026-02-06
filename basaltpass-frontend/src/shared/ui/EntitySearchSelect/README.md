# EntitySearchSelect 组件集成指南

## 概述
`EntitySearchSelect` 是一个通用的搜索选择组件，支持用户、租户和应用的搜索与选择功能。

## 快速开始

### 1. 基本导入
```typescript
import { EntitySearchSelect, BaseEntityItem } from '@/components'
```

### 2. 基本用法示例

#### 用户搜索（普通用户上下文）
```typescript
const [selectedUsers, setSelectedUsers] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="user"
  context="user"  // 普通用户权限
  value={selectedUsers}
  onChange={setSelectedUsers}
  placeholder="搜索用户..."
  variant="chips"
/>
```

#### 用户搜索（管理员上下文）
```typescript
const [selectedAdminUsers, setSelectedAdminUsers] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="user"
  context="admin"  // 管理员权限，可搜索所有用户
  value={selectedAdminUsers}
  onChange={setSelectedAdminUsers}
  placeholder="搜索平台用户..."
  variant="list"
/>
```

#### 租户搜索
```typescript
const [selectedTenants, setSelectedTenants] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="tenant"
  context="admin"
  value={selectedTenants}
  onChange={setSelectedTenants}
  placeholder="搜索租户..."
  variant="chips"
  maxSelect={3}
/>
```

#### 应用搜索
```typescript
const [selectedApps, setSelectedApps] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="app"
  context="admin"
  value={selectedApps}
  onChange={setSelectedApps}
  placeholder="搜索应用..."
  variant="list"
  limit={8}
/>
```

## API 参考

### Props
| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `entity` | `'user' \| 'tenant' \| 'app'` | - | 搜索的实体类型 |
| `context` | `'user' \| 'admin' \| 'tenant'` | - | 搜索上下文，影响可访问的数据范围 |
| `value` | `BaseEntityItem[]` | - | 当前选中的项目列表 |
| `onChange` | `(items: BaseEntityItem[]) => void` | - | 选中项变化回调 |
| `placeholder` | `string` | `'搜索...'` | 输入框占位符 |
| `variant` | `'chips' \| 'list'` | `'chips'` | 显示模式 |
| `maxSelect` | `number` | `Infinity` | 最大选择数量 |
| `limit` | `number` | `10` | 搜索结果数量限制 |

### BaseEntityItem 接口
```typescript
interface BaseEntityItem {
  id: string
  title: string
  subtitle?: string
  avatar?: string
  raw: any  // 原始数据对象
}
```

## 集成场景

### 1. 团队邀请功能
已集成在 `Invite.tsx` 中，用于邀请用户加入团队。

### 2. 管理员创建租户
已集成在 `CreateTenant.tsx` 中，用于选择租户负责人。

### 3. 权限分配
```typescript
// 为用户分配权限时选择用户
<EntitySearchSelect
  entity="user"
  context="admin"
  value={selectedUsers}
  onChange={setSelectedUsers}
  placeholder="选择要分配权限的用户..."
  variant="list"
  maxSelect={10}
/>
```

### 4. 资源分配
```typescript
// 为租户分配应用时选择应用
<EntitySearchSelect
  entity="app"
  context="admin"
  value={selectedApps}
  onChange={setSelectedApps}
  placeholder="选择要分配的应用..."
  variant="chips"
/>
```

### 5. 批量操作
```typescript
// 批量操作时选择目标
<EntitySearchSelect
  entity="tenant"
  context="admin"
  value={selectedTenants}
  onChange={setSelectedTenants}
  placeholder="选择要操作的租户..."
  variant="list"
  maxSelect={50}
  limit={20}
/>
```

## 样式自定义

组件使用 Tailwind CSS 构建，支持通过以下方式自定义样式：

### 1. 容器样式
组件会自动适应父容器的宽度，你可以通过包装 div 来控制宽度：
```tsx
<div className="max-w-md">
  <EntitySearchSelect ... />
</div>
```

### 2. 主题颜色
组件使用 Tailwind 的颜色系统，主要颜色为 `indigo`、`blue`、`green` 等。

## 注意事项

1. **权限控制**：确保 `context` 参数与当前用户权限匹配
2. **性能优化**：对于大量数据，建议设置合适的 `limit` 值
3. **错误处理**：组件内部已处理 API 错误，会在搜索失败时显示提示
4. **响应式设计**：组件在移动端和桌面端都有良好的显示效果

## 故障排除

### 1. 搜索无结果
- 检查 API 接口是否正常
- 确认搜索关键词是否正确
- 验证用户权限是否足够

### 2. 下拉框位置异常
- 组件使用 Portal 渲染，确保没有 CSS 冲突
- 检查父容器的 `overflow` 设置

### 3. 性能问题
- 减少 `limit` 值
- 增加搜索防抖时间（组件内置 300ms）

## 扩展开发

如需添加新的实体类型，需要：
1. 在组件中添加新的 `entity` 类型
2. 实现对应的搜索 API 调用
3. 添加实体特定的显示逻辑
