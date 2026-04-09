import React from 'react'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'orange'
  | 'blue'

type BadgeSize = 'sm' | 'md'

interface PBadgeProps {
  /** translated */
  variant?: BadgeVariant
  /** translated */
  size?: BadgeSize
  /** cantranslated（translated） */
  icon?: React.ReactNode
  /** isnotranslated */
  dot?: boolean
  className?: string
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default:  'bg-gray-100 text-gray-700',
  success:  'bg-green-100 text-green-800',
  warning:  'bg-yellow-100 text-yellow-800',
  error:    'bg-red-100 text-red-800',
  info:     'bg-blue-100 text-blue-800',
  purple:   'bg-indigo-100 text-indigo-800',
  orange:   'bg-yellow-100 text-yellow-800',
  blue:     'bg-blue-100 text-blue-800',
}

const dotStyles: Record<BadgeVariant, string> = {
  default:  'bg-gray-400',
  success:  'bg-green-500',
  warning:  'bg-yellow-500',
  error:    'bg-red-500',
  info:     'bg-blue-500',
  purple:   'bg-indigo-500',
  orange:   'bg-yellow-500',
  blue:     'bg-blue-500',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
}

const PBadge: React.FC<PBadgeProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  dot = false,
  className = '',
  children,
}) => {
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
    >
      {dot && (
        <span
          className={`mr-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotStyles[variant]}`}
        />
      )}
      {!dot && icon && (
        <span className="mr-1 -ml-0.5 h-3.5 w-3.5 flex-shrink-0">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}

PBadge.displayName = 'PBadge'

export default PBadge
