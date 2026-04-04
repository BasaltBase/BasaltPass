export type SessionNoticeCode =
  | 'session_expired'
  | 'tenant_access_required'
  | 'admin_access_required'

const SESSION_NOTICE_KEY = 'bp_session_notice'

const NOTICE_MESSAGES: Record<SessionNoticeCode, string> = {
  session_expired: '当前登录会话已过期，请重新登录。',
  tenant_access_required: '当前账号没有可用的租户控制台访问权限，请重新登录或切换其他账户。',
  admin_access_required: '当前账号没有可用的管理员控制台访问权限，请重新登录或切换其他账户。',
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function getSessionNoticeMessage(code: string | null | undefined) {
  if (!code) {
    return ''
  }
  return NOTICE_MESSAGES[code as SessionNoticeCode] || ''
}

export function setSessionNotice(code: SessionNoticeCode) {
  if (!isBrowser()) {
    return
  }
  window.sessionStorage.setItem(SESSION_NOTICE_KEY, code)
}

export function peekSessionNotice() {
  if (!isBrowser()) {
    return null
  }
  return window.sessionStorage.getItem(SESSION_NOTICE_KEY)
}

export function consumeSessionNotice() {
  if (!isBrowser()) {
    return null
  }
  const value = window.sessionStorage.getItem(SESSION_NOTICE_KEY)
  if (value) {
    window.sessionStorage.removeItem(SESSION_NOTICE_KEY)
  }
  return value
}
