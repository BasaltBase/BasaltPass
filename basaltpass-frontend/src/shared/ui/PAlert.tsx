import React from 'react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface PAlertProps {
  /** 语义类型 */
  variant?: AlertVariant
  /** 可选标题（加粗） */
  title?: string
  /** 内容（字符串或ReactNode） */
  children?: React.ReactNode
  /** 简短消息（与 children 二选一，字符串快捷用法） */
  message?: string
  /** 是否可关闭 */
  dismissible?: boolean
  onDismiss?: () => void
  /** 右下角行动按钮区域 */
  actions?: React.ReactNode
  className?: string
}

const config: Record<AlertVariant, {
  bg: string
  border: string
  titleColor: string
  textColor: string
  icon: React.FC<{ className?: string }>
}> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
    icon: CheckCircleIcon,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
    icon: ExclamationCircleIcon,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
    icon: ExclamationTriangleIcon,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
    icon: InformationCircleIcon,
  },
}

const PAlert: React.FC<PAlertProps> = ({
  variant = 'info',
  title,
  children,
  message,
  dismissible = false,
  onDismiss,
  actions,
  className = '',
}) => {
  const c = config[variant]
  const Icon = c.icon
  const content = children ?? message

  return (
    <div
      className={`
        rounded-md border p-4
        ${c.bg} ${c.border}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${c.titleColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-semibold ${c.titleColor} mb-1`}>{title}</h3>
          )}
          {content && (
            <div className={`text-sm ${c.textColor}`}>{content}</div>
          )}
          {actions && (
            <div className="mt-3">{actions}</div>
          )}
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onDismiss}
              className={`
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${c.textColor} hover:${c.bg} focus:ring-offset-${c.bg}
              `}
              aria-label="关闭"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

PAlert.displayName = 'PAlert'

export default PAlert
