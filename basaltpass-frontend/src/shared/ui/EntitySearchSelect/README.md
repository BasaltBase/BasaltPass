# EntitySearchSelect componenttranslated

## translated
`EntitySearchSelect` istranslatedsearchtranslatedcomponent，translateduser、tenantandapptranslatedsearchandtranslated。

## translatedstart

### 1. translated
```typescript
import { EntitySearchSelect, BaseEntityItem } from '@/components'
```

### 2. translated

#### usersearch（translatedusertranslated）
```typescript
const [selectedUsers, setSelectedUsers] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="user"
  context="user"  // translateduserpermission
  value={selectedUsers}
  onChange={setSelectedUsers}
  placeholder="searchuser..."
  variant="chips"
/>
```

#### usersearch（managementtranslated）
```typescript
const [selectedAdminUsers, setSelectedAdminUsers] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="user"
  context="admin"  // managementtranslatedpermission，cansearchtranslatedhasuser
  value={selectedAdminUsers}
  onChange={setSelectedAdminUsers}
  placeholder="searchtranslateduser..."
  variant="list"
/>
```

#### tenantsearch
```typescript
const [selectedTenants, setSelectedTenants] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="tenant"
  context="admin"
  value={selectedTenants}
  onChange={setSelectedTenants}
  placeholder="searchtenant..."
  variant="chips"
  maxSelect={3}
/>
```

#### appsearch
```typescript
const [selectedApps, setSelectedApps] = useState<BaseEntityItem[]>([])

<EntitySearchSelect
  entity="app"
  context="admin"
  value={selectedApps}
  onChange={setSelectedApps}
  placeholder="searchapp..."
  variant="list"
  limit={8}
/>
```

## API translated

### Props
| translated | type | defaultvalue | translated |
|-----|------|-------|------|
| `entity` | `'user' \| 'tenant' \| 'app'` | - | searchtranslatedtype |
| `context` | `'user' \| 'admin' \| 'tenant'` | - | searchtranslated，translatedcantranslated |
| `value` | `BaseEntityItem[]` | - | translatedlist |
| `onChange` | `(items: BaseEntityItem[]) => void` | - | translated |
| `placeholder` | `string` | `'search...'` | translated |
| `variant` | `'chips' \| 'list'` | `'chips'` | translated |
| `maxSelect` | `number` | `Infinity` | translated |
| `limit` | `number` | `10` | searchtranslated |

### BaseEntityItem translated
```typescript
interface BaseEntityItem {
  id: string
  title: string
  subtitle?: string
  avatar?: string
  raw: any  // translated
}
```

## translated

### 1. teaminvitationtranslated
alreadytranslated `Invite.tsx` translated，translatedinvitationusertranslatedteam。

### 2. managementtranslatedcreatetenant
alreadytranslated `CreateTenant.tsx` translated，translatedtenanttranslated。

### 3. permissiontranslated
```typescript
// translatedusertranslatedpermissiontranslateduser
<EntitySearchSelect
  entity="user"
  context="admin"
  value={selectedUsers}
  onChange={setSelectedUsers}
  placeholder="translatedpermissiontranslateduser..."
  variant="list"
  maxSelect={10}
/>
```

### 4. translated
```typescript
// translatedtenanttranslatedapptranslatedapp
<EntitySearchSelect
  entity="app"
  context="admin"
  value={selectedApps}
  onChange={setSelectedApps}
  placeholder="translatedapp..."
  variant="chips"
/>
```

### 5. translated
```typescript
// translated
<EntitySearchSelect
  entity="tenant"
  context="admin"
  value={selectedTenants}
  onChange={setSelectedTenants}
  placeholder="translatedtenant..."
  variant="list"
  maxSelect={50}
  limit={20}
/>
```

## styletranslated

componenttranslated Tailwind CSS translated，translatedstyle：

### 1. translatedstyle
componenttranslated，translatedcantranslated div translated：
```tsx
<div className="max-w-md">
  <EntitySearchSelect ... />
</div>
```

### 2. translated
componenttranslated Tailwind translatedsystem，translated `indigo`、`blue`、`green` translated。

## translated

1. **permissiontranslated**：translated `context` translatedandtranslateduserpermissiontranslated
2. **translated**：translated，translated `limit` value
3. **errortranslated**：componenttranslatedalreadytranslated API error，translatedsearchfailedtranslated
4. **responsetranslated**：componenttranslatedandtranslatedhastranslated

## translated

### 1. searchnonetranslated
- translated API translatedisnotranslated
- translatedsearchtranslatedisnotranslated
- translateduserpermissionisnotranslated

### 2. translated
- componenttranslated Portal translated，translatedhas CSS translated
- translated `overflow` translated

### 3. translated
- translated `limit` value
- translatedsearchtranslatedtime（componenttranslated 300ms）

## translated

translatedtype，translated：
1. translatedcomponenttranslated `entity` type
2. translatedsearch API translated
3. translated
