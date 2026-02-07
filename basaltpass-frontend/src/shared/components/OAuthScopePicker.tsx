import { useMemo } from 'react'
import { PCheckbox } from '@ui'

export interface OAuthScopeMetaLike {
  scope: string
  title: string
  description: string
  category: string
}

interface OAuthScopePickerProps {
  metas: OAuthScopeMetaLike[]
  selected: string[]
  onToggle: (scope: string) => void
  loading?: boolean
  error?: string
  /** Fallback scopes when metas is empty/unavailable */
  fallbackScopes?: string[]
  /** Number of columns on md+ screens */
  columnsMd?: 1 | 2 | 3
}

export default function OAuthScopePicker({
  metas,
  selected,
  onToggle,
  loading = false,
  error = '',
  fallbackScopes = ['openid', 'profile', 'email', 'offline_access'],
  columnsMd = 2
}: OAuthScopePickerProps) {
  const scopeGroups = useMemo(() => {
    const sorted = (metas || []).slice().sort((a, b) => {
      if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '')
      return (a.scope || '').localeCompare(b.scope || '')
    })

    return sorted.reduce<Record<string, OAuthScopeMetaLike[]>>((acc, meta) => {
      const key = meta.category || 'Other'
      acc[key] = acc[key] || []
      acc[key].push(meta)
      return acc
    }, {})
  }, [metas])

  const gridColsMd = columnsMd === 1 ? 'md:grid-cols-1' : columnsMd === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'

  return (
    <div>
      {error ? (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : Object.keys(scopeGroups).length === 0 ? (
        <div className={`grid grid-cols-2 ${gridColsMd} gap-3`}>
          {fallbackScopes.map((scope) => (
            <PCheckbox
              key={scope}
              variant="card"
              checked={(selected || []).includes(scope)}
              onChange={() => onToggle(scope)}
              label={scope}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(scopeGroups).map(([category, groupMetas]) => (
            <div key={category}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{category}</div>
              <div className={`grid grid-cols-1 ${gridColsMd} gap-3`}>
                {groupMetas.map((meta) => (
                  <PCheckbox
                    key={meta.scope}
                    variant="card"
                    checked={(selected || []).includes(meta.scope)}
                    onChange={() => onToggle(meta.scope)}
                    label={
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{meta.title || meta.scope}</span>
                        <span className="text-xs text-gray-500 font-mono">{meta.scope}</span>
                      </div>
                    }
                    description={meta.description}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
