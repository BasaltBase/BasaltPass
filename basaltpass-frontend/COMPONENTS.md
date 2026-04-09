# BasaltPass translatedcomponentsystem

## translated

translated BasaltPass apptranslated UI style，translatedcreatetranslated P-Input and P-Button translatedcomponent，translatedandtranslated。

## componenttranslated

### P-Input component

translatedcomponent，translatedstyleandtranslated。

#### translated
- 🎨 **translated**: default（default）、rounded（translated）、minimal（translated）
- 📏 **translated**: sm（translated）、md（translated）、lg（translated）
- 🔒 **passwordtranslated**: translatedpasswordtranslated/translated
- 🖼️ **translated**: translated
- ❌ **errorstatus**: translatederrorinfotranslated
- ♿ **nonetranslated**: translatedand ARIA translated

#### translated

```tsx
import { PInput } from '../components';

// translated
<PInput 
  label="username"
  placeholder="please enterusername"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>

// passwordtranslated
<PInput 
  type="password"
  label="password"
  placeholder="please enterpassword"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  showPassword={showPassword}
  onTogglePassword={() => setShowPassword(!showPassword)}
/>

// translated
<PInput 
  label="email"
  placeholder="user@example.com"
  icon={<EnvelopeIcon />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// translated
<PInput variant="rounded" label="translated" />
<PInput variant="minimal" label="translated" />

// errorstatus
<PInput 
  label="verification code"
  error="verification codetranslated"
  value={code}
  onChange={(e) => setCode(e.target.value)}
/>
```

#### Props

| translated | type | defaultvalue | description |
|------|------|--------|------|
| label | string \| ReactNode | - | translated |
| error | string | - | errorinfo |
| icon | ReactNode | - | translated |
| showPassword | boolean | - | passwordisnotranslated |
| onTogglePassword | () => void | - | passwordtranslated |
| variant | 'default' \| 'rounded' \| 'minimal' | 'default' | styletranslated |
| size | 'sm' \| 'md' \| 'lg' | 'md' | translated |

### P-Button component

translatedcomponent，translatedstyleandstatus。

#### translated
- 🎨 **translated**: primary（translated）、secondary（translated）、danger（translated）、ghost（translated）、gradient（translated）
- 📏 **translated**: sm（translated）、md（translated）、lg（translated）
- ⏳ **translatedstatus**: translated
- 🖼️ **translated**: translated
- 📱 **responsetranslated**: translated
- ♿ **nonetranslated**: translatedandtranslated

#### translated

```tsx
import { PButton } from '../components';

// translated
<PButton variant="primary">
  translated
</PButton>

// translatedstatus
<PButton variant="primary" loading>
  submittranslated...
</PButton>

// translated
<PButton 
  variant="secondary"
  leftIcon={<UserIcon className="h-4 w-4" />}
>
  translateduser
</PButton>

// translated
<PButton variant="primary" fullWidth>
  login
</PButton>

// translated
<PButton size="sm">translated</PButton>
<PButton size="md">translated</PButton>
<PButton size="lg">translated</PButton>

// translated
<PButton variant="primary">translated</PButton>
<PButton variant="secondary">translated</PButton>
<PButton variant="danger">translated</PButton>
<PButton variant="ghost">translated</PButton>
<PButton variant="gradient">translated</PButton>
```

#### Props

| translated | type | defaultvalue | description |
|------|------|--------|------|
| variant | 'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'gradient' | 'primary' | translated |
| size | 'sm' \| 'md' \| 'lg' | 'md' | translated |
| loading | boolean | false | translatedstatus |
| leftIcon | ReactNode | - | translated |
| rightIcon | ReactNode | - | translated |
| fullWidth | boolean | false | isnotranslated |

## translated

### translated

**translated：**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">
    emailtranslated
  </label>
  <input
    type="email"
    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
    placeholder="please enteremailtranslated"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>
```

**translated：**
```tsx
<PInput
  type="email"
  label="emailtranslated"
  placeholder="please enteremailtranslated"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### translated

**translated：**
```tsx
<button
  type="submit"
  disabled={isLoading}
  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? 'logintranslated...' : 'login'}
</button>
```

**translated：**
```tsx
<PButton
  type="submit"
  variant="gradient"
  fullWidth
  loading={isLoading}
>
  login
</PButton>
```

## alreadyupdatetranslated

translatedalreadytranslatedupdatetranslatedcomponentsystem：

### translated
- ✅ `/pages/auth/Login.tsx` - logintranslated
- ✅ `/pages/auth/Register.tsx` - registertranslated

### usersecuritytranslated
- ✅ `/pages/user/security/SecuritySettings.tsx` - passwordtranslatedandtranslatedinfotranslated

### managementtranslated
- ✅ `/pages/admin/user/Users.tsx` - usermanagement（translated）

## translated

### translatedsystem
- **Primary（translated）**: Indigo translated - translated
- **Secondary（translated）**: Gray translated - translated
- **Danger（translated）**: Red translated - translateddeletetranslated
- **Ghost（translated）**: translated - translated
- **Gradient（translated）**: Blue to Indigo - translated

### translated
- **Small (sm)**: translated
- **Medium (md)**: defaulttranslated，translated
- **Large (lg)**: translatedortranslated

### translatedstatus
- **Hover**: translated
- **Focus**: translated
- **Active**: translatedstatus
- **Disabled**: disabledstatus
- **Loading**: translatedstatus

## translated

1. **translated**：translatedandtranslatedcomponent
2. **translatedsystem**：translated
3. **translatedcomponent**：createtranslatedcomponent，translated P-Select、P-Checkbox translated
4. **documentationtranslated**：translatedandtranslated
5. **translated**：translatedcomponenttranslated

## translated

1. **translatedcomponent**：translated P-Input and P-Button
2. **translated**：translatedandtranslated
3. **translated**：translated
4. **nonetranslated**：translatedanddescriptiontranslated
5. **translated**：translatedcreatetranslatedcomponenttranslated

## translated

translatedtotranslatedorhastranslated，pleasetranslatedteamortranslated Issue。
