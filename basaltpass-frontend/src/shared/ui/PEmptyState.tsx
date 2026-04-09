import React from 'react'
import { InboxIcon } from '@heroicons/react/24/outline'

interface PEmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

interface PEmptyStateProps {
  /** translated（translatedHeroiconcomponentortranslatedReactNode） */
  icon?: React.FC<{ className?: string }> | React.ReactNode
  /** translated */
  title?: string
  /** descriptiontranslated */
  description?: string
  /** translated（cantranslated） */
  action?: PEmptyStateAction
  /** translated */
  children?: React.ReactNode
  className?: string
}

const PEmptyState: React.FC<PEmptyStateProps> = ({
  icon,
  title = 'translatednonetranslated',
  description,
  action,
  children,
  className = '',
}) => {
  const renderIcon = () => {
    if (!icon) {
      return <InboxIcon className="mx-auto h-12 w-12 text-gray-300" />
    }

    if (React.isValidElement(icon)) {
      return <div className="flex justify-center">{icon}</div>
    }

    const isComponentLike =
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))

    if (isComponentLike) {
      const IconComponent = icon as React.ElementType<{ className?: string }>
      return <IconComponent className="mx-auto h-12 w-12 text-gray-300" />
    }

    return <div className="flex justify-center">{icon}</div>
  }

  return (
    <div className={`text-center py-12 ${className}`}>
      {renderIcon()}
      {title && (
        <h3 className="mt-3 text-sm font-medium text-gray-900">{title}</h3>
      )}
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

PEmptyState.displayName = 'PEmptyState'

export default PEmptyState
