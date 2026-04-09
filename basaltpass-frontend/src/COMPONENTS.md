# BasaltPass componenttranslateddocumentation

## translated

BasaltPass componenttranslated、cantranslated、typesecuritytranslated React component，translated Tailwind CSS translatedsystemtranslated。

## componentlist

### 1. PInput - translatedcomponent

translatedcomponent，translatedandtranslatedstatus。

#### translated

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

#### translated

```tsx
// translated
<PInput
  type="email"
  placeholder="translatedemailtranslated"
  variant="default"
  size="md"
/>

// translated
<PInput
  type="text"
  placeholder="searchuser"
  leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
  variant="filled"
/>

// passwordtranslated
<PInput
  type="password"
  placeholder="translatedpassword"
  showPassword={showPassword}
  onTogglePassword={() => setShowPassword(!showPassword)}
  error={errors.password}
/>
```

#### translated

- **default**: translatedstyle
- **filled**: translatedstyle
- **underline**: translatedstyle

---

### 2. PButton - translatedcomponent

translatedcomponent，translatedstyletranslatedandtranslatedstatus。

#### translated

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

#### translated

```tsx
// translated
<PButton variant="primary" size="md">
  translated
</PButton>

// translated
<PButton
  variant="secondary"
  leftIcon={<PlusIcon className="h-5 w-5" />}
>
  translateduser
</PButton>

// translatedstatustranslated
<PButton
  variant="primary"
  loading={isSubmitting}
  disabled={isSubmitting}
>
  {isSubmitting ? 'submittranslated...' : 'submit'}
</PButton>

// translated
<PButton variant="gradient" fullWidth>
  login
</PButton>
```

#### translated

- **primary**: translated，translated
- **secondary**: translated，translated
- **danger**: translated，translated
- **ghost**: translated，translated
- **gradient**: translated，translated

---

### 3. PCheckbox - translatedcomponent

translatedcomponent，translatedstyleandtranslated。

#### translated

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

#### translated

```tsx
// translated
<PCheckbox
  label="translated"
  checked={rememberMe}
  onChange={(e) => setRememberMe(e.target.checked)}
/>

// translatedstyletranslated
<PCheckbox
  variant="switch"
  label="enabledtranslated"
  description="translatedsecuritytranslated"
  checked={enabledTwoFA}
  onChange={(e) => setEnabledTwoFA(e.target.checked)}
/>

// translatedstyletranslated
<PCheckbox
  variant="card"
  size="lg"
  label="translated"
  description="translatedhastranslatedandtranslated"
  checked={hasAdvancedFeatures}
  onChange={(e) => setHasAdvancedFeatures(e.target.checked)}
/>

// translated
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

// translatedconfirmstatustranslated
<PCheckbox
  label="translated"
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  onChange={handleSelectAll}
/>
```

#### translated

- **default**: translatedstyle
- **switch**: translatedstyle
- **card**: translatedstyle，translated

#### translated

- **indeterminate**: translatedconfirmstatus，translated/translated
- **ReactNode label**: translated，cantranslated、translated
- **labelPosition**: translated（translatedortranslated）

---

### 4. PToggle - translatedcomponent

translatedcomponent，translated。

#### translated

```tsx
interface PToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string | React.ReactNode;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'right' | 'left';
}
```

#### translated

```tsx
// translated
<PToggle
  label="translatednotification"
  checked={notifications}
  onChange={(e) => setNotifications(e.target.checked)}
/>

// translateddescriptiontranslated
<PToggle
  label="translated"
  description="enabledtranslated"
  checked={darkMode}
  onChange={(e) => setDarkMode(e.target.checked)}
/>

// translated
<PToggle
  size="lg"
  label="translatedsave"
  description="translated30translatedsavetranslated"
  checked={autoSave}
  onChange={(e) => setAutoSave(e.target.checked)}
/>

// translated
<PToggle
  label="translated"
  labelPosition="left"
  checked={advancedSettings}
  onChange={(e) => setAdvancedSettings(e.target.checked)}
/>

// errorstatus
<PToggle
  label="translated"
  error="translatedcantranslated"
  checked={false}
  disabled
/>
```

#### translated

- **translated**: translated，translatedswitchtranslated
- **translated**: translatedandtranslated
- **translated**: andtranslatedcomponenttranslated
- **translated**: translated

---

## translated

### translated
- translatedhascomponenttranslated API translated
- translated（variant, size, error translated）
- translatedandtranslated

### cantranslated
- translated
- translated ARIA translated
- translated
- translatedmanagementandtranslated

### typesecurity
- translated TypeScript typetranslated
- translatedandtranslated
- translatedtypetranslated
- translatedtypetranslated

### translated
- forwardRef translated ref translated
- translated HTML translated
- translatedandtranslated
- translated

## translated

### translated

```tsx
// translatedcomponenttranslated
import { PInput } from '@/components';

// translatedcomponenttranslated
import { PInput, PButton, PCheckbox, PToggle } from '@/components';
```

### translated

```tsx
// translated
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
        placeholder="emailtranslated"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
        error={errors.email}
      />
      
      <PInput
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        error={errors.password}
      />
      
      <PCheckbox
        label="translated"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
      />

      <PToggle
        label="enabledtranslated"
        description="translatedsecuritytranslated"
        checked={enabledTwoFA}
        onChange={(e) => setEnabledTwoFA(e.target.checked)}
      />
      
      <PButton
        type="submit"
        variant="primary"
        fullWidth
        loading={isLoading}
      >
        login
      </PButton>
    </form>
  );
}
```

### styletranslated

componenttranslated Tailwind CSS translated，translated className translatedstyletranslated：

```tsx
<PInput
  className="my-custom-input"
  // translated...
/>
```

### responsetranslated

componenttranslatedresponsetranslated，translated：

```tsx
// translated
<PButton size="sm" className="md:size-md lg:size-lg">
  responsetranslated
</PButton>
```

## translated

### translatedcomponent

1. translated `src/shared/ui/` translatedcreatetranslated UI componenttranslated
2. translatedhastranslatedand API translated
3. translated TypeScript typetranslated
4. translateddocumentationandtranslated
5. translated `src/shared/ui/index.ts` translated UI component

### componenttranslated

- translated forwardRef translated ref translated
- translated HTML translated
- translated variant and size translatedstyletranslated
- translated error translatederrorstatustranslated
- translatedcantranslatedandtranslated
