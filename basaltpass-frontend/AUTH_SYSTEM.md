# BasaltPass translatedsystem

## translated

translatedsystemtranslatedusertranslated，translatedusertranslatedtokentranslatedornonetranslatedtologintranslated，translatedalreadyloginusertranslatedlogin/registertranslated。

## translatedcomponent

### 1. AuthContext (translated)
**translated**: `src/contexts/AuthContext.tsx`

- **translated**: translatedmanagementusertranslatedstatus
- **translated**:
  - translatedtokenhastranslated
  - translatedlogin/logouttranslated
  - managementuserinfostatus
  - translatedtokentranslated

### 2. ProtectedRoute (translatedroute)
**translated**: `src/components/ProtectedRoute.tsx`

- **translated**: translated
- **translated**:
  - translateduserisnoalreadytranslated
  - nottranslatedusertranslatedtologintranslated
  - translatedstatus

### 3. PublicRoute (translatedroute)
**translated**: `src/components/PublicRoute.tsx`

- **translated**: translated（login/register）
- **translated**:
  - alreadyloginusertranslatedtotranslated
  - translatedalreadytranslatedusertranslatedlogintranslated

### 4. APItranslated
**translated**: `src/api/client.ts`

- **translated**: translatedAPIrequesttranslated
- **translated**:
  - translatedAuthorizationtranslated
  - translated401errortranslated
  - translatednonetranslatedtoken

## routetranslatedconfig

### translated（translatedlogin）
translatedhastranslated`ProtectedRoute`translated：

```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

**translated**:
- `/dashboard` - translated
- `/profile` - profile
- `/teams/*` - teamtranslated
- `/wallet/*` - translated
- `/security/*` - securitytranslated
- `/admin/*` - managementtranslated
- `/subscriptions/*` - subscriptiontranslated
- `/orders/*` - ordertranslated

### translated（alreadyloginusertranslated）
loginandregistertranslated`PublicRoute`translated：

```tsx
<Route path="/login" element={
  <PublicRoute>
    <Login />
  </PublicRoute>
} />
```

**translated**:
- `/login` - logintranslated
- `/register` - registertranslated

## translated

### 1. usertranslated
```
usertranslated /dashboard
    ↓
ProtectedRoutetranslatedstatus
    ↓
nottranslated → translatedto /login
alreadytranslated → translated
```

### 2. usertranslatedlogintranslated
```
usertranslated /login
    ↓
PublicRoutetranslatedstatus
    ↓
alreadytranslated → translatedto /dashboard
nottranslated → translatedlogintranslated
```

### 3. Tokentranslated
```
APIrequestback401error
    ↓
translatedto401
    ↓
translatedtoken
    ↓
translatedtologintranslated
```

## translated

### translatedcomponenttranslatedstatus

```tsx
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <div>pleasetranslatedlogin</div>
  }
  
  return (
    <div>
      <p>translated, {user?.nickname}</p>
      <button onClick={logout}>translatedlogin</button>
    </div>
  )
}
```

### translated

```tsx
// translatedrouter.tsxtranslated
<Route path="/new-page" element={
  <ProtectedRoute>
    <NewPage />
  </ProtectedRoute>
} />
```

### translated

```tsx
// translatedrouter.tsxtranslated
<Route path="/public-page" element={
  <PublicRoute>
    <PublicPage />
  </PublicRoute>
} />
```

## translated

### 1. translatednotloginstatus
1. translated
2. translated（translated `/dashboard`）
3. translatedtologintranslated

### 2. translatedalreadyloginstatus
1. translatedloginsystem
2. translatedlogintranslated（`/login`）
3. translatedtotranslated

### 3. translatedTokentranslated
1. translatednonetranslatedtokentolocalStorage
2. translatedortranslated
3. translatedtologintranslated

### 4. translated
translated `test-auth.html` translated

## securitytranslated

1. **translatedTokentranslated**: translatedtokenhastranslated
2. **translated**: translatedstatustranslatedtotranslated
3. **Tokentranslated**: translatedtononetranslatedtokentranslated
4. **translatedlogin**: alreadyloginusernonetranslatedlogintranslated
5. **APItranslated**: translatedhasAPIrequesttranslated

## translated

1. **componenttranslated**: AuthProvidertranslatedBrowserRoutertranslated
2. **routeconfig**: translatedhastranslatedProtectedRoute
3. **APIerrortranslated**: 401errortranslated，nonetranslated
4. **statusmanagement**: translatedAuthContexttranslatedmanagementtranslatedstatus

## translated

### translated

1. **useNavigateerror**: translatedAuthProvidertranslatedBrowserRoutertranslated
2. **nonetranslated**: translatedrouteconfigisnotranslated
3. **Tokentranslatedupdate**: translatedAuthContexttranslatedlogintranslated
4. **translated**: translatedProtectedRoute/PublicRouteconfig

### translated

1. translatederrorinfo
2. translatedlocalStoragetranslatedaccess_token
3. translatedtest-auth.htmltranslated
4. translatednetworkrequesttranslatedAuthorizationtranslated 