import React, { forwardRef, TextareaHTMLAttributes } from 'react';

interface PTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  variant?: 'default' | 'rounded' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const PTextarea = forwardRef<HTMLTextAreaElement, PTextareaProps>(
  ({
    label,
    error,
    variant = 'default',
    size = 'md',
    fullWidth = true,
    className = '',
    rows = 3,
    ...props
  }, ref) => {
    const baseStyles = `
      block border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
    `;

    const variantStyles = {
      default: 'border-gray-300 rounded-md shadow-sm bg-white',
      rounded: 'border-gray-200 rounded-xl shadow-sm bg-white/80',
      minimal: 'border-gray-200 rounded-lg bg-gray-50'
    } as const;

    const sizeStyles = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    } as const;

    const widthStyles = fullWidth ? 'w-full' : '';

    const textareaClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${widthStyles}
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
        <textarea
          ref={ref}
          className={textareaClasses}
          rows={rows}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

PTextarea.displayName = 'PTextarea';

export default PTextarea;
