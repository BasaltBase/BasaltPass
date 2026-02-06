import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface PSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  variant?: 'default' | 'rounded' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const PSelect = forwardRef<HTMLSelectElement, PSelectProps>(
  ({ 
    label, 
    error, 
    variant = 'default',
    size = 'md',
    fullWidth = true,
    className = '', 
    children,
    ...props 
  }, ref) => {

    // 基础样式
    const baseStyles = `
      appearance-none bg-white border transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
      disabled:border-gray-200
    `;

    // 变体样式
    const variantStyles = {
      default: 'border-gray-300 rounded-md shadow-sm',
      rounded: 'border-gray-200 rounded-xl shadow-sm',
      minimal: 'border-gray-200 rounded-lg bg-gray-50'
    };

    // 尺寸样式
    const sizeStyles = {
      sm: 'px-2 py-1 pr-8 text-sm',
      md: 'px-3 py-2 pr-10 text-sm',
      lg: 'px-4 py-3 pr-12 text-base'
    };

    // 宽度样式
    const widthStyles = fullWidth ? 'w-full' : '';

    const selectClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${widthStyles}
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      ${className}
    `.trim();

    // 图标尺寸
    const iconSize = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5', 
      lg: 'h-6 w-6'
    };

    // 图标位置
    const iconPosition = {
      sm: 'right-2',
      md: 'right-3',
      lg: 'right-4'
    };

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={selectClasses}
            {...props}
          >
            {children}
          </select>
          <div className={`absolute inset-y-0 ${iconPosition[size]} flex items-center pointer-events-none`}>
            <ChevronDownIcon className={`${iconSize[size]} text-gray-400`} />
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

PSelect.displayName = 'PSelect';

export default PSelect;
