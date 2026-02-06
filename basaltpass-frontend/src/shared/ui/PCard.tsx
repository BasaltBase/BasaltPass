import React, { forwardRef } from 'react'
import { HTMLAttributes } from 'react'

interface PCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 卡片变体
   * - default: 默认样式，白色背景
   * - bordered: 带边框样式
   * - elevated: 提升样式，更大阴影
   */
  variant?: 'default' | 'bordered' | 'elevated'
  
  /**
   * 卡片尺寸
   * - sm: 小尺寸，较小内边距
   * - md: 中等尺寸（默认）
   * - lg: 大尺寸，较大内边距
   */
  size?: 'sm' | 'md' | 'lg'
  
  /**
   * 是否可悬停效果
   */
  hoverable?: boolean
  
  /**
   * 自定义内边距
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

const PCard = forwardRef<HTMLDivElement, PCardProps>(
  ({ 
    className = '', 
    variant = 'default', 
    size = 'md',
    hoverable = false,
    padding,
    children,
    ...props 
  }, ref) => {
    
    // 变体样式
    const variantClasses = {
      default: 'bg-white shadow-sm',
      bordered: 'bg-white border border-gray-200 shadow-sm',
      elevated: 'bg-white shadow-md'
    }
    
    // 尺寸样式（当没有自定义 padding 时使用）
    const sizeClasses = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    }
    
    // 内边距样式
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    }
    
    // 悬停效果
    const hoverClasses = hoverable 
      ? 'transition-shadow duration-200 hover:shadow-lg' 
      : ''
    
    // 组合所有类名
    const combinedClasses = [
      // 基础样式：圆弧和阴影
      'rounded-lg',
      // 变体样式
      variantClasses[variant],
      // 内边距样式
      padding ? paddingClasses[padding] : sizeClasses[size],
      // 悬停效果
      hoverClasses,
      // 自定义类名
      className
    ].filter(Boolean).join(' ')

    return (
      <div
        ref={ref}
        className={combinedClasses}
        {...props}
      >
        {children}
      </div>
    )
  }
)

PCard.displayName = 'PCard'

export default PCard
