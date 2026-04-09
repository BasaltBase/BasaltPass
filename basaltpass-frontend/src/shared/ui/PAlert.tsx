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
  /** translatedtype */
  variant?: AlertVariant
  /** cantranslated（translated） */
  title?: string
  /** translated（translatedorReactNode） */
  children?: React.ReactNode
  /** translated（and children translated，translated） */
  message?: string
  /** isnocantranslated */
  dismissible?: boolean
  onDismiss?: () => void
  /** translated */
  actions?: React.ReactNode
  className?: string
}

const config: Record<AlertVariant, {
  bg: string
  border: string
  titleColor: string
  textColor: string
  closeHover: string
  closeRingOffset: string
  icon: React.FC<{ className?: string }>
}> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
    closeHover: 'hover:bg-green-100',
    closeRingOffset: 'focus:ring-offset-green-50',
    icon: CheckCircleIcon,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
    closeHover: 'hover:bg-red-100',
    closeRingOffset: 'focus:ring-offset-red-50',
    icon: ExclamationCircleIcon,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
    closeHover: 'hover:bg-yellow-100',
    closeRingOffset: 'focus:ring-offset-yellow-50',
    icon: ExclamationTriangleIcon,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
    closeHover: 'hover:bg-blue-100',
    closeRingOffset: 'focus:ring-offset-blue-50',
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
        rounded-lg border p-4
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
                inline-flex rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${c.textColor} ${c.closeHover} ${c.closeRingOffset}
              `}
              aria-label="translated"
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
