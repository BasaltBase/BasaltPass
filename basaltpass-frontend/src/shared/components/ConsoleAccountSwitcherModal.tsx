import { useEffect, useMemo, useState } from 'react'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { Modal, PButton } from '@ui'
import { uiAlert } from '@contexts/DialogContext'
import { authorizeConsoleWithToken, joinConsoleUrl, type ConsoleTarget } from '@api/console'
import { clearAccessTokenForScope, clearScopeCookies } from '@utils/auth'
import {
  listUserConsoleSessions,
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
    return 'from-indigo-500 to-blue-600'
  }
  if (canAccessTenantConsole(session)) {
    return 'from-violet-500 to-fuchsia-500'
  }
  return 'from-slate-500 to-slate-600'
}

function getSessionBadges(session: UserConsoleSession) {
  const badges: Array<{ label: string; className: string }> = []

  if (session.is_super_admin) {
    badges.push({
      label: '平台管理员',
      className: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
    })
  }

  if (session.tenant_id > 0) {
    badges.push({
      label: session.tenant_name || `租户 ${session.tenant_id}`,
      className: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    })
  } else {
    badges.push({
      label: '平台账户',
      className: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
    })
  }

  if (session.tenant_role) {
    badges.push({
      label: session.tenant_role,
      className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
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
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<UserConsoleSession[]>([])

  useEffect(() => {
    if (!open) {
      return
    }
    setSessions(listUserConsoleSessions())
  }, [open])

  const getActionsForSession = (session: UserConsoleSession): SessionAction[] => {
    const actions: SessionAction[] = []

    if (currentScope === 'tenant' && currentTenantId > 0) {
      actions.push({
        id: `tenant:${session.key}:${currentTenantId}`,
        label: '进入当前租户面板',
        target: 'tenant',
        tenantId: currentTenantId,
        href: joinConsoleUrl(consoleTenantUrl, `tenant/dashboard?code=__CODE__`),
      })
    }

    if (currentScope === 'admin' && canAccessAdminConsole(session)) {
      actions.push({
        id: `admin:${session.key}`,
        label: '进入管理员面板',
        target: 'admin',
        href: joinConsoleUrl(consoleAdminUrl, 'admin/dashboard?code=__CODE__'),
      })
    }

    if (currentScope === 'tenant' && canAccessAdminConsole(session)) {
      actions.push({
        id: `admin:${session.key}`,
        label: '切到管理员面板',
        target: 'admin',
        href: joinConsoleUrl(consoleAdminUrl, 'admin/dashboard?code=__CODE__'),
      })
    }

    if (currentScope === 'admin' && canAccessTenantConsole(session)) {
      actions.push({
        id: `tenant:${session.key}:${session.tenant_id}`,
        label: '切到默认租户面板',
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
      const message = error?.response?.data?.error || error?.message || '账户切换失败，请重新登录目标账户。'
      await uiAlert(message, '无法切换账户')
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
      { key: 'actionable', title: '可直接切换', description: '这些账户可以立即进入当前目标控制台。', sessions: actionable },
      { key: 'unavailable', title: '仅保留会话', description: '这些账户已登录，但当前没有匹配的控制台切换入口。', sessions: unavailable },
    ].filter((group) => group.sessions.length > 0)
  }, [sessions, currentScope, currentTenantId, currentUserId, consoleTenantUrl, consoleAdminUrl])

  return (
    <Modal
      open={open}
      title="切换账户"
      description="这里列出当前浏览器里已经登录过的 user 账户。选择一个账户后，系统会自动为目标控制台重新签发对应的会话。"
      onClose={() => {
        if (!switchingId) {
          onClose()
        }
      }}
      widthClass="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <ArrowsRightLeftIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {currentScope === 'admin' ? '管理员控制台切换' : '租户控制台切换'}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-600">
                系统会复用浏览器里已存在的 user 会话，为目标控制台重新签发对应的 token 与 cookie，
                这样你不需要先退回用户面板再重新登录。
              </div>
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            当前浏览器还没有可用的 user 会话，请先在用户面板登录目标账户。
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
                const badges = getSessionBadges(session)

                return (
                  <div
                    key={session.key}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                      isCurrentUser ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'
                    }`}
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${getSessionAccent(session)}`} />
                    <div className="px-5 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            {session.avatar_url ? (
                              <img
                                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200"
                                src={session.avatar_url}
                                alt={displayName}
                              />
                            ) : (
                              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${getSessionAccent(session)} text-sm font-semibold text-white shadow-sm`}>
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-semibold text-slate-900">{displayName}</span>
                                {isCurrentUser ? (
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                                    当前使用中
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
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
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
                              variant={action.target === 'admin' ? 'primary' : 'secondary'}
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
                            退出账户
                          </PButton>

                          {actions.length === 0 ? (
                            <div className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-500">
                              当前没有可用的控制台切换入口
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
