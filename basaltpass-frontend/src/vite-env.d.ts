/// <reference types="vite/client" /> 

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_TIMEOUT_MS?: string
  readonly VITE_AUTH_SCOPE?: string
  readonly VITE_AUTH_TIMEOUT_MS?: string
  readonly VITE_CONSOLE_ADMIN_URL?: string
  readonly VITE_CONSOLE_TENANT_URL?: string
  readonly VITE_CONSOLE_USER_URL?: string
  readonly VITE_PUBLIC_CONFIG_TIMEOUT_MS?: string
  readonly VITE_PUBLIC_TENANT_TIMEOUT_MS?: string
  readonly VITE_TOKEN_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
