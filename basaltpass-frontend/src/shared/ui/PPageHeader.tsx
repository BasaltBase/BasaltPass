import React from 'react'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface PPageHeaderProps {
  /** 页面主标题 */
  title: React.ReactNode
  /** 副标题/描述 */
  description?: React.ReactNode
  /** 标题左侧图标 */
  icon?: React.ReactNode
  /** 右侧操作区域（通常是PButton组合） */
  actions?: React.ReactNode
  /** 返回链接路径（使用 react-router Link） */
  backTo?: string
  /** 返回按钮文字 */
  backLabel?: string
  /** 返回按钮点击事件（与 backTo 二选一） */
  onBack?: () => void
  className?: string
}

const PPageHeader: React.FC<PPageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  backTo,
  backLabel = '返回',
  onBack,
  className = '',
}) => {
  const showBack = backTo || onBack

  return (
    <div className={`mb-6 ${className}`}>
      {showBack && (
        <div className="mb-3">
          {backTo ? (
            <Link
              to={backTo}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              {backLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              {backLabel}
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="flex-shrink-0 text-gray-600">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

PPageHeader.displayName = 'PPageHeader'

export default PPageHeader
