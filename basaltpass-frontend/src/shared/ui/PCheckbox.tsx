import React, { forwardRef, InputHTMLAttributes } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface PCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string | React.ReactNode;
  description?: string;
  error?: string;
  variant?: 'default' | 'card' | 'switch';
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  labelPosition?: 'right' | 'left';
}

const PCheckbox = forwardRef<HTMLInputElement, PCheckboxProps>(
  ({ 
    label, 
    description,
    error, 
    variant = 'default',
    size = 'md',
    indeterminate = false,
    labelPosition = 'right',
    className = '', 
    checked,
    disabled,
    ...props 
  }, ref) => {

    // 基础样式
    const baseStyles = `
      relative inline-flex items-center justify-center
      border-2 rounded transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    // 尺寸样式
    const sizeStyles = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5', 
      lg: 'h-6 w-6'
    };

    // 变体样式
    const getVariantStyles = () => {
      const isChecked = checked || indeterminate;
      
      if (variant === 'switch') {
        return {
          container: `
            ${sizeStyles[size] === 'h-4 w-4' ? 'h-6 w-10' : sizeStyles[size] === 'h-5 w-5' ? 'h-6 w-11' : 'h-7 w-12'}
            ${isChecked ? 'bg-indigo-600' : 'bg-gray-200'}
            border-transparent rounded-full cursor-pointer
            ${disabled ? 'cursor-not-allowed' : ''}
          `,
          thumb: `
            ${sizeStyles[size] === 'h-4 w-4' ? 'h-4 w-4' : sizeStyles[size] === 'h-5 w-5' ? 'h-4 w-4' : 'h-5 w-5'}
            bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out
            ${isChecked ? 
              (sizeStyles[size] === 'h-4 w-4' ? 'translate-x-4' : 
               sizeStyles[size] === 'h-5 w-5' ? 'translate-x-5' : 'translate-x-5') 
              : 'translate-x-1'}
          `
        };
      }

      if (variant === 'card') {
        return {
          container: `
            ${sizeStyles[size]} ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
            ${error ? 'border-red-300' : ''}
            shadow-sm
          `,
          thumb: ''
        };
      }

      // default variant
      return {
        container: `
          ${sizeStyles[size]} ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
          ${error ? 'border-red-300' : ''}
        `,
        thumb: ''
      };
    };

    const variantStyles = getVariantStyles();

    // 标签样式
    const labelStyles = `
      ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm'}
      ${disabled ? 'text-gray-400' : 'text-gray-700'}
      font-medium select-none cursor-pointer
    `;

    // 描述样式
    const descriptionStyles = `
      ${size === 'sm' ? 'text-xs' : 'text-sm'}
      text-gray-500 mt-1
    `;

    const checkboxClasses = `
      ${baseStyles}
      ${variantStyles.container}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    const CheckboxInput = () => (
      <input
        ref={ref}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        {...props}
      />
    );

    const CheckboxVisual = () => {
      if (variant === 'switch') {
        return (
          <div className={checkboxClasses}>
            <CheckboxInput />
            <div className={variantStyles.thumb} />
          </div>
        );
      }

      return (
        <div className={checkboxClasses}>
          <CheckboxInput />
          {(checked || indeterminate) && (
            <div className="text-white">
              {indeterminate ? (
                <div className="w-3 h-0.5 bg-current" />
              ) : (
                <CheckIcon className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} strokeWidth={3} />
              )}
            </div>
          )}
        </div>
      );
    };

    const LabelContent = () => (
      <>
        {label && (
          <span className={labelStyles}>
            {label}
          </span>
        )}
        {description && (
          <div className={descriptionStyles}>
            {description}
          </div>
        )}
      </>
    );

    if (variant === 'card') {
      const isChecked = checked || indeterminate;
      return (
        <div className="space-y-1">
          <label className={`
            flex items-start p-4 border rounded-lg cursor-pointer transition-all duration-200
            ${isChecked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white hover:bg-gray-50'}
            ${error ? 'border-red-300' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
            <div className="flex items-center h-5">
              <CheckboxVisual />
            </div>
            <div className="ml-3 flex-1">
              <LabelContent />
            </div>
          </label>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className={`
          flex items-center
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${labelPosition === 'left' ? 'flex-row-reverse' : ''}
        `}>
          <CheckboxVisual />
          {label && (
            <div className={labelPosition === 'left' ? 'mr-3' : 'ml-3'}>
              <LabelContent />
            </div>
          )}
        </label>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

PCheckbox.displayName = 'PCheckbox';

export default PCheckbox;
