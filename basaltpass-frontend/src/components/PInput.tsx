import React, { forwardRef, InputHTMLAttributes } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface PInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  icon?: React.ReactNode;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  variant?: 'default' | 'rounded' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

const PInput = forwardRef<HTMLInputElement, PInputProps>(
  ({ 
    label, 
    error, 
    icon, 
    showPassword, 
    onTogglePassword, 
    variant = 'default',
    size = 'md',
    className = '', 
    type,
    ...props 
  }, ref) => {
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    // 基础样式
    const baseStyles = `
      block w-full border transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
    `;

    // 变体样式
    const variantStyles = {
      default: 'border-gray-300 rounded-md shadow-sm bg-white',
      rounded: 'border-gray-200 rounded-xl shadow-sm bg-white/80',
      minimal: 'border-gray-200 rounded-lg bg-gray-50'
    };

    // 尺寸样式
    const sizeStyles = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };

    // 图标和密码切换按钮的padding调整
    const paddingStyles = icon && (isPassword && onTogglePassword) 
      ? 'pl-10 pr-10' 
      : icon 
        ? 'pl-10 pr-3' 
        : (isPassword && onTogglePassword) 
          ? 'pl-3 pr-10' 
          : 'px-3';

    const inputClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${size === 'sm' ? 'px-2 py-1 text-sm' : size === 'lg' ? 'px-4 py-3 text-base' : paddingStyles + ' py-2 text-sm'}
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      ${className}
    `.trim();

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="h-5 w-5 text-gray-400">
                {icon}
              </div>
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={inputClasses}
            {...props}
          />
          {isPassword && onTogglePassword && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={onTogglePassword}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

PInput.displayName = 'PInput';

export default PInput;
