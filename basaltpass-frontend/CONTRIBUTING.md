# Frontend Contribution Guide

To keep UI consistent, always use our design-system components for interactive controls and containers.

- Inputs: use `PInput` (text, number, email, password, etc.)
- Textarea: use `PTextarea`
- Select: use `PSelect`
- Buttons: use `PButton`
- Toggle/Switch: use `PToggle`
- Card/Container: use `PCard`

Import from the components barrel file using a relative path:

```tsx
import { PInput, PButton, PSelect, PTextarea, PToggle, PCard } from '../../components'
```

Notes
- Prefer `variant` and `size` props on P* components instead of hand-written Tailwind classes.
- Use `icon`, `leftIcon`, `rightIcon`, and `loading` props when relevant.
- For navigation that looks like a button, wrap your router `Link` around a `PButton`-styled element or use a `PButton` with an `onClick` that calls `navigate`.
- Avoid raw `<input>`, `<button>`, `<select>`, and `<textarea>` unless wrapped by a P* component.

Examples

```tsx
// Search input with icon
<PInput icon={<MagnifyingGlassIcon className="h-5 w-5" />} placeholder="搜索…" />

// Danger action
<PButton variant="danger">删除</PButton>

// Select with label
<PSelect label="状态">
  <option value="">全部</option>
  <option value="active">活跃</option>
</PSelect>

// Textarea
<PTextarea label="备注" rows={3} />
```
