import type { ReactNode } from 'react'
import type { TenantInfo } from './types'

interface TenantLoginShellProps {
  children: ReactNode
  description: ReactNode
  subtitle: string
  tenantCode?: string
  tenantInfo: TenantInfo | null
  title: string
}

export function TenantLoginShell({
  children,
  description,
  subtitle,
  tenantCode,
  tenantInfo,
  title,
}: TenantLoginShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                <span className="text-sm font-semibold text-white">{tenantInfo?.name?.slice(0, 1) || '?'}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{tenantInfo?.name || tenantCode}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
              <div className="mt-2 text-sm text-gray-600">{description}</div>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
