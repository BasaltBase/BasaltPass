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
  currentScope: ConsoleTarget | 'user'
  currentTenantId?: number
  currentUserId?: number
  currentSessionKey?: string
  currentUserTenants?: Array<{
    id: number
    name?: string
    code?: string
    role?: string
    metadata?: Record<string, any>
  }>
  consoleUserUrl?: string
  consoleTenantUrl?: string
  consoleAdminUrl?: string
  onSwitchSession?: (sessionKey: string) => Promise<void> | void
  onSwitchTenantIdentity?: (tenantID: number) => Promise<void> | void
}

type SessionAction = {
  id: string
  label: string
  kind: 'console' | 'session' | 'identity'
  target?: ConsoleTarget
  tenantId?: number
  href?: string
}

function listTenantMemberships(session: UserConsoleSession) {
  return Array.isArray(session.tenant_memberships)
    ? session.tenant_memberships.filter((membership) => Number(membership?.id || 0) > 0)
    : []
}

function listTenantConsoleMemberships(session: UserConsoleSession) {
  const fromSession = listTenantMemberships(session).filter((membership) => {
    const role = String(membership?.role || '').toLowerCase()
    return ['owner', 'admin'].includes(role)
  })

  if (fromSession.length > 0) {
    return fromSession
  }

  if (session.tenant_id > 0) {
    const fallbackRole = String(session.tenant_role || '').toLowerCase()
    if (!['owner', 'admin'].includes(fallbackRole)) {
      return []
    }
    return [{
      id: session.tenant_id,
      name: session.tenant_name,
      code: session.tenant_code,
      role: fallbackRole,
    }]
  }

  return []
}

function listTenantIdentityMemberships(session: UserConsoleSession) {
  const fromSession = listTenantMemberships(session).filter((membership) => {
    const role = String(membership?.role || '').toLowerCase()
    return role === '' || ['owner', 'admin', 'member', 'user'].includes(role)
  })

  if (fromSession.length > 0) {
    return fromSession
  }

  if (session.tenant_id > 0) {
    const fallbackRole = String(session.tenant_role || '').toLowerCase()
    if (!['owner', 'admin', 'member', 'user'].includes(fallbackRole)) {
      return []
    }
    return [{
      id: session.tenant_id,
      name: session.tenant_name,
      code: session.tenant_code,
      role: fallbackRole,
    }]
  }

  return []
}

function canAccessTenantConsole(session: UserConsoleSession) {
  return listTenantConsoleMemberships(session).length > 0
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
  currentUserTenants = [],
  consoleUserUrl = '',
  consoleTenantUrl = '',
  consoleAdminUrl = '',
  onSwitchSession,
  onSwitchTenantIdentity,
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

  const isCurrentSession = (session: UserConsoleSession) => {
    if (currentSessionKey) {
      return session.key === currentSessionKey
    }
    return currentUserId > 0 && session.user_id === currentUserId
  }

  const getActionsForSession = (session: UserConsoleSession): SessionAction[] => {
    const actions: SessionAction[] = []
    const tenantConsoleMemberships = listTenantConsoleMemberships(session)
    const defaultTenant = tenantConsoleMemberships[0]

    if (currentScope === 'user') {
      actions.push({
        id: `session:${session.key}`,
        label: t('consoleSwitcher.actions.switchToThisSession'),
        kind: 'session',
      })
      return actions
    }

    if (currentScope === 'tenant' && currentTenantId > 0) {
      actions.push({
        id: `tenant:${session.key}:${currentTenantId}`,
        label: t('consoleSwitcher.actions.enterCurrentTenantPanel'),
        kind: 'console',
        target: 'tenant',
        tenantId: currentTenantId,
        href: joinConsoleUrl(consoleTenantUrl, `tenant/dashboard?code=__CODE__`),
      })
    }

    if (currentScope === 'admin' && canAccessAdminConsole(session)) {
      actions.push({
        id: `admin:${session.key}`,
        label: t('consoleSwitcher.actions.enterAdminPanel'),
        kind: 'console',
        target: 'admin',
        href: joinConsoleUrl(consoleAdminUrl, 'admin/dashboard?code=__CODE__'),
      })
    }

    if (currentScope === 'tenant' && canAccessAdminConsole(session)) {
      actions.push({
        id: `admin:${session.key}`,
        label: t('consoleSwitcher.actions.switchToAdminPanel'),
        kind: 'console',
        target: 'admin',
        href: joinConsoleUrl(consoleAdminUrl, 'admin/dashboard?code=__CODE__'),
      })
    }

    if (currentScope === 'admin' && defaultTenant) {
      actions.push({
        id: `tenant:${session.key}:${defaultTenant.id}`,
        label: t('consoleSwitcher.actions.switchToDefaultTenantPanel'),
        kind: 'console',
        target: 'tenant',
        tenantId: defaultTenant.id,
        href: joinConsoleUrl(consoleTenantUrl, 'tenant/dashboard?code=__CODE__'),
      })
    }

    return actions
  }

  const handleConsoleSwitch = async (session: UserConsoleSession, action: SessionAction) => {
    if (action.kind !== 'console' || !action.target || !action.href) {
      return
    }

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

  const handleSessionSwitch = async (session: UserConsoleSession, action: SessionAction) => {
    if (action.kind !== 'session') {
      return
    }

    if (!onSwitchSession) {
      await uiAlert(t('consoleSwitcher.errors.sessionSwitchUnavailable'), t('consoleSwitcher.errors.switchFailedTitle'))
      return
    }

    setSwitchingId(action.id)
    try {
      await onSwitchSession(session.key)
      onClose()
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || t('consoleSwitcher.errors.switchFailed')
      await uiAlert(message, t('consoleSwitcher.errors.switchFailedTitle'))
    } finally {
      setSwitchingId(null)
    }
  }

  const handleIdentitySwitch = async (action: SessionAction) => {
    if (action.kind !== 'identity') {
      return
    }

    if (typeof action.tenantId !== 'number' || !onSwitchTenantIdentity) {
      await uiAlert(t('consoleSwitcher.errors.identitySwitchUnavailable'), t('consoleSwitcher.errors.switchFailedTitle'))
      return
    }

    setSwitchingId(action.id)
    try {
      await onSwitchTenantIdentity(action.tenantId)
      onClose()
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || t('consoleSwitcher.errors.switchFailed')
      await uiAlert(message, t('consoleSwitcher.errors.switchFailedTitle'))
    } finally {
      setSwitchingId(null)
    }
  }

  const handleAction = async (session: UserConsoleSession, action: SessionAction) => {
    if (action.kind === 'session') {
      await handleSessionSwitch(session, action)
      return
    }
    if (action.kind === 'identity') {
      await handleIdentitySwitch(action)
      return
    }
    await handleConsoleSwitch(session, action)
  }

  const currentSession = useMemo(() => {
    if (currentScope !== 'user') {
      return null
    }
    const foundByKey = currentSessionKey ? sessions.find((session) => session.key === currentSessionKey) : null
    if (foundByKey) {
      return foundByKey
    }
    if (currentUserId > 0) {
      return sessions.find((session) => Number(session.user_id) === Number(currentUserId)) || null
    }
    return null
  }, [currentScope, currentSessionKey, currentUserId, sessions])

  const identityOptions = useMemo(() => {
    if (currentScope !== 'user') {
      return [] as Array<{ tenantId: number; label: string }>
    }

    const options = new Map<number, { tenantId: number; label: string }>()
    options.set(0, { tenantId: 0, label: t('consoleSwitcher.badges.platformAccount') })

    currentUserTenants.forEach((tenant) => {
      const roleFromMetadata = String(tenant?.metadata?.user_role || '').toLowerCase()
      const role = roleFromMetadata || String(tenant?.role || '').toLowerCase()
      const tenantID = Number(tenant?.id || 0)
      if (tenantID <= 0) {
        return
      }
      if (!['owner', 'admin', 'member', 'user'].includes(role)) {
        return
      }
      options.set(tenantID, {
        tenantId: tenantID,
        label: tenant?.name || t('consoleSwitcher.badges.tenantFallback', { tenantId: tenantID }),
      })
    })

    if (options.size === 1 && currentSession) {
      listTenantIdentityMemberships(currentSession).forEach((membership) => {
        const tenantID = Number(membership?.id || 0)
        if (tenantID <= 0) {
          return
        }
        options.set(tenantID, {
          tenantId: tenantID,
          label: membership?.name || t('consoleSwitcher.badges.tenantFallback', { tenantId: tenantID }),
        })
      })
    }

    return Array.from(options.values()).sort((a, b) => {
      if (a.tenantId === 0) return -1
      if (b.tenantId === 0) return 1
      return a.tenantId - b.tenantId
    })
  }, [currentScope, currentSession, currentUserTenants, t])

  const accountSessions = useMemo(() => {
    if (currentScope !== 'user') {
      return sessions
    }
    if (currentUserId <= 0) {
      return sessions
    }
    return sessions.filter((session) => Number(session.user_id) !== Number(currentUserId))
  }, [currentScope, currentUserId, sessions])

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

    accountSessions.forEach((session) => {
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
  }, [accountSessions, currentScope, currentTenantId, consoleTenantUrl, consoleAdminUrl, t])

  const scopeTitle = currentScope === 'admin'
    ? t('consoleSwitcher.switchTitleAdmin')
    : currentScope === 'tenant'
      ? t('consoleSwitcher.switchTitleTenant')
      : t('consoleSwitcher.switchTitleUser')

  const showIdentitySection = currentScope === 'user' && identityOptions.length > 0
  const showSessionSection = currentScope === 'user' && accountSessions.length > 0

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
      <div className="space-y-5">
        {cleanedCount > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('consoleSwitcher.cleanedNotice', { count: cleanedCount })}
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                <ArrowsRightLeftIcon className="h-4 w-4" />
              </span>
              {scopeTitle}
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
              {currentScope}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">{t('consoleSwitcher.switchDescription')}</div>
        </div>

        {showIdentitySection ? (
          <div className="space-y-3">
            <div className="px-1">
              <div className="text-sm font-semibold text-slate-900">{t('consoleSwitcher.sections.identityTitle')}</div>
              <div className="mt-1 text-xs text-slate-500">{t('consoleSwitcher.sections.identityDescription')}</div>
            </div>
            {identityOptions.map((option) => {
              const isCurrentPerspective = Number(option.tenantId) === Number(currentTenantId || 0)
              return (
                <div
                  key={`identity-option-${option.tenantId}`}
                  className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                    isCurrentPerspective ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`h-1 w-full ${isCurrentPerspective ? 'bg-slate-700' : 'bg-slate-300'}`} />
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{option.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {option.tenantId === 0
                            ? t('consoleSwitcher.badges.platformAccount')
                            : t('consoleSwitcher.badges.tenantFallback', { tenantId: option.tenantId })}
                        </div>
                      </div>
                      <PButton
                        type="button"
                        size="sm"
                        variant={isCurrentPerspective ? 'ghost' : 'secondary'}
                        className="w-full justify-center sm:w-auto sm:min-w-[260px]"
                        disabled={!!switchingId || isCurrentPerspective}
                        loading={switchingId === `identity:current:${option.tenantId}`}
                        onClick={() => void handleIdentitySwitch({
                          id: `identity:current:${option.tenantId}`,
                          label: option.label,
                          kind: 'identity',
                          tenantId: option.tenantId,
                        })}
                      >
                        {isCurrentPerspective
                          ? t('consoleSwitcher.currentInUse')
                          : option.tenantId === 0
                            ? t('consoleSwitcher.actions.switchToGlobalIdentity')
                            : t('consoleSwitcher.actions.switchToTenantIdentity', { tenant: option.label })}
                      </PButton>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {showIdentitySection && showSessionSection ? (
          <div className="border-t border-slate-200" />
        ) : null}

        {currentScope === 'user' ? (
          showSessionSection ? (
            <div className="space-y-3">
              <div className="px-1">
                <div className="text-sm font-semibold text-slate-900">{t('consoleSwitcher.sections.accountsTitle')}</div>
                <div className="mt-1 text-xs text-slate-500">{t('consoleSwitcher.sections.accountsDescription')}</div>
              </div>

              {accountSessions.map((session) => {
                const actions = getActionsForSession(session)
                const displayName = session.nickname || session.email
                const isCurrentUser = isCurrentSession(session)
                const badges = getSessionBadges(session, t)

                return (
                  <div
                    key={session.key}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                      isCurrentUser ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`h-1 w-full ${getSessionAccent(session)}`} />
                    <div className="px-4 py-4 sm:px-5">
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

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] sm:items-end">
                          {actions.length > 0 ? actions.map((action) => (
                            <PButton
                              key={action.id}
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="w-full justify-center sm:w-auto sm:min-w-[260px]"
                              disabled={!!switchingId}
                              loading={switchingId === action.id}
                              onClick={() => void handleAction(session, action)}
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
                            className="w-full justify-center text-slate-500 hover:text-red-600 sm:w-auto"
                          >
                            {t('consoleSwitcher.actions.signOutAccount')}
                          </PButton>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : !showIdentitySection ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              {t('consoleSwitcher.empty')}
            </div>
          ) : null
        ) : accountSessions.length === 0 ? (
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
                const isCurrentUser = isCurrentSession(session)
                const badges = getSessionBadges(session, t)

                return (
                  <div
                    key={session.key}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                      isCurrentUser ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`h-1 w-full ${getSessionAccent(session)}`} />
                    <div className="px-4 py-4 sm:px-5">
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

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] sm:items-end">
                          {actions.length > 0 ? actions.map((action) => (
                            <PButton
                              key={action.id}
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="w-full justify-center sm:w-auto sm:min-w-[260px]"
                              disabled={!!switchingId}
                              loading={switchingId === action.id}
                              onClick={() => void handleAction(session, action)}
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
                            className="w-full justify-center text-slate-500 hover:text-red-600 sm:w-auto"
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
