import { useEffect, useMemo, useState } from 'react'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { Modal, PButton } from '@ui'
import { uiAlert } from '@contexts/DialogContext'
import { authorizeConsoleWithToken, joinConsoleUrl, type ConsoleTarget } from '@api/console'
import { clearAccessTokenForScope, clearScopeCookies } from '@utils/auth'
import { useI18n } from '@shared/i18n'
import {
  listUserConsoleSessions,
  pruneExpiredUserConsoleSessions,
  removeUserConsoleSessionByKey,
  type UserConsoleSession,
} from '@utils/userSessions'

interface ConsoleAccountSwitcherModalProps {
  open: boolean
  onClose: () => void
  currentScope: ConsoleTarget
  currentTenantId?: number
  currentUserId?: number
  currentSessionKey?: string
  consoleUserUrl?: string
  consoleTenantUrl?: string
  consoleAdminUrl?: string
}

type SessionAction = {
  id: string
  label: string
  target: ConsoleTarget
  tenantId?: number
  href: string
}

function canAccessTenantConsole(session: UserConsoleSession) {
  const role = String(session.tenant_role || '').toLowerCase()
  return session.tenant_id > 0 && ['owner', 'admin'].includes(role)
}

function canAccessAdminConsole(session: UserConsoleSession) {
  return !!session.is_super_admin
}

function getSessionAccent(session: UserConsoleSession) {
  if (session.is_super_admin) {
    return 'bg-slate-700'
  }
  if (canAccessTenantConsole(session)) {
    return 'bg-slate-500'
  }
  return 'bg-slate-300'
}

function getSessionBadges(session: UserConsoleSession, t: (key: string, params?: Record<string, string | number>) => string) {
  const badges: Array<{ label: string; className: string }> = []

  if (session.is_super_admin) {
    badges.push({
      label: t('consoleSwitcher.badges.platformAdmin'),
      className: 'border border-slate-300 bg-slate-100 text-slate-700',
    })
  }

  if (session.tenant_id > 0) {
    badges.push({
      label: session.tenant_name || t('consoleSwitcher.badges.tenantFallback', { tenantId: session.tenant_id }),
      className: 'border border-slate-300 bg-white text-slate-700',
    })
  } else {
    badges.push({
      label: t('consoleSwitcher.badges.platformAccount'),
      className: 'border border-slate-300 bg-white text-slate-700',
    })
  }

  if (session.tenant_role) {
    badges.push({
      label: session.tenant_role,
      className: 'border border-slate-300 bg-slate-50 text-slate-600',
    })
  }

  return badges
}

export default function ConsoleAccountSwitcherModal({
  open,
  onClose,
  currentScope,
  currentTenantId = 0,
  currentUserId = 0,
  currentSessionKey = '',
  consoleUserUrl = '',
  consoleTenantUrl = '',
  consoleAdminUrl = '',
}: ConsoleAccountSwitcherModalProps) {
  const { t } = useI18n()
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<UserConsoleSession[]>([])
  const [cleanedCount, setCleanedCount] = useState(0)

  useEffect(() => {
    if (!open) {
      return
    }
    const original = listUserConsoleSessions()
    const active = pruneExpiredUserConsoleSessions()
    setSessions(active)
    setCleanedCount(Math.max(0, original.length - active.length))
  }, [open])

  const getActionsForSession = (session: UserConsoleSession): SessionAction[] => {
    const actions: SessionAction[] = []

    if (currentScope === 'tenant' && currentTenantId > 0) {
      actions.push({
        id: `tenant:${session.key}:${currentTenantId}`,
        label: t('consoleSwitcher.actions.enterCurrentTenantPanel'),
        target: 'tenant',
        tenantId: currentTenantId,
        href: joinConsoleUrl(consoleTenantUrl, `tenant/dashboard?code=__CODE__`),
      })
    }

    if (currentScope === 'admin' && canAccessAdminConsole(session)) {
      actions.push({
        id: `admin:${session.key}`,
        label: t('consoleSwitcher.actions.enterAdminPanel'),
        target: 'admin',
        href: joinConsoleUrl(consoleAdminUrl, 'admin/dashboard?code=__CODE__'),
      })
    }

    if (currentScope === 'tenant' && canAccessAdminConsole(session)) {
      actions.push({
        id: `admin:${session.key}`,
        label: t('consoleSwitcher.actions.switchToAdminPanel'),
        target: 'admin',
        href: joinConsoleUrl(consoleAdminUrl, 'admin/dashboard?code=__CODE__'),
      })
    }

    if (currentScope === 'admin' && canAccessTenantConsole(session)) {
      actions.push({
        id: `tenant:${session.key}:${session.tenant_id}`,
        label: t('consoleSwitcher.actions.switchToDefaultTenantPanel'),
        target: 'tenant',
        tenantId: session.tenant_id,
        href: joinConsoleUrl(consoleTenantUrl, 'tenant/dashboard?code=__CODE__'),
      })
    }

    return actions
  }

  const handleSwitch = async (session: UserConsoleSession, action: SessionAction) => {
    setSwitchingId(action.id)
    try {
      const { code } = await authorizeConsoleWithToken(session.token, action.target, action.tenantId)
      window.location.href = action.href.replace('__CODE__', encodeURIComponent(code))
    } catch (error: any) {
      if (error?.response?.status === 401) {
        removeUserConsoleSessionByKey(session.key)
        setSessions((current) => current.filter((item) => item.key !== session.key))
      }
      const message = error?.response?.status === 401
        ? t('consoleSwitcher.errors.sessionExpired')
        : error?.response?.data?.error || error?.message || t('consoleSwitcher.errors.switchFailed')
      await uiAlert(message, t('consoleSwitcher.errors.switchFailedTitle'))
      setSwitchingId(null)
    }
  }

  const handleSignOut = async (session: UserConsoleSession) => {
    const isCurrentConsoleUser = currentSessionKey
      ? session.key === currentSessionKey
      : currentUserId > 0 && session.user_id === currentUserId

    removeUserConsoleSessionByKey(session.key)
    setSessions((current) => current.filter((item) => item.key !== session.key))

    if (!isCurrentConsoleUser) {
      return
    }

    clearAccessTokenForScope(currentScope)
    clearScopeCookies(currentScope)
    window.location.href = joinConsoleUrl(consoleUserUrl, 'login')
  }

  const sessionGroups = useMemo(() => {
    const actionable: UserConsoleSession[] = []
    const unavailable: UserConsoleSession[] = []

    sessions.forEach((session) => {
      if (getActionsForSession(session).length > 0) {
        actionable.push(session)
      } else {
        unavailable.push(session)
      }
    })

    return [
      { key: 'actionable', title: t('consoleSwitcher.groups.actionable.title'), description: t('consoleSwitcher.groups.actionable.description'), sessions: actionable },
      { key: 'unavailable', title: t('consoleSwitcher.groups.unavailable.title'), description: t('consoleSwitcher.groups.unavailable.description'), sessions: unavailable },
    ].filter((group) => group.sessions.length > 0)
  }, [sessions, currentScope, currentTenantId, currentUserId, consoleTenantUrl, consoleAdminUrl, t])

  return (
    <Modal
      open={open}
      title={t('consoleSwitcher.title')}
      description={t('consoleSwitcher.description')}
      onClose={() => {
        if (!switchingId) {
          onClose()
        }
      }}
      widthClass="max-w-3xl"
    >
      <div className="space-y-4">
        {cleanedCount > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('consoleSwitcher.cleanedNotice', { count: cleanedCount })}
          </div>
        ) : null}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
              <ArrowsRightLeftIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {currentScope === 'admin' ? t('consoleSwitcher.switchTitleAdmin') : t('consoleSwitcher.switchTitleTenant')}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-600">
                {t('consoleSwitcher.switchDescription')}
              </div>
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            {t('consoleSwitcher.empty')}
          </div>
        ) : (
          sessionGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="px-1">
                <div className="text-sm font-semibold text-slate-900">{group.title}</div>
                <div className="mt-1 text-xs text-slate-500">{group.description}</div>
              </div>

              {group.sessions.map((session) => {
                const actions = getActionsForSession(session)
                const displayName = session.nickname || session.email
                const isCurrentUser = currentSessionKey
                  ? session.key === currentSessionKey
                  : currentUserId > 0 && session.user_id === currentUserId
                const badges = getSessionBadges(session, t)

                return (
                  <div
                    key={session.key}
                    className={`overflow-hidden rounded-lg border bg-white transition ${
                      isCurrentUser ? 'border-slate-400 bg-slate-50' : 'border-slate-200'
                    }`}
                  >
                    <div className={`h-1 w-full ${getSessionAccent(session)}`} />
                    <div className="px-4 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            {session.avatar_url ? (
                              <img
                                className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200"
                                src={session.avatar_url}
                                alt={displayName}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-semibold text-slate-900">{displayName}</span>
                                {isCurrentUser ? (
                                  <span className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                    {t('consoleSwitcher.currentInUse')}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 truncate text-sm text-slate-500">{session.email}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {badges.map((badge) => (
                              <span
                                key={`${session.key}-${badge.label}`}
                                className={`rounded px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {actions.length > 0 ? actions.map((action) => (
                            <PButton
                              key={action.id}
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={!!switchingId}
                              loading={switchingId === action.id}
                              onClick={() => void handleSwitch(session, action)}
                            >
                              <span className="mr-2 inline-flex items-center">
                                <ArrowsRightLeftIcon className="h-4 w-4" />
                              </span>
                              {action.label}
                            </PButton>
                          )) : null}

                          <PButton
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={!!switchingId}
                            onClick={() => void handleSignOut(session)}
                            className="text-slate-500 hover:text-red-600"
                          >
                            {t('consoleSwitcher.actions.signOutAccount')}
                          </PButton>

                          {actions.length === 0 ? (
                            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                              {t('consoleSwitcher.noAvailableAction')}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
