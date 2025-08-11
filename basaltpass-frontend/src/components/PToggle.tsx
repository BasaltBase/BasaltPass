import React, { forwardRef, InputHTMLAttributes } from 'react';

interface PToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string | React.ReactNode;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'right' | 'left';
}

const PToggle = forwardRef<HTMLInputElement, PToggleProps>(
  ({ 
    label, 
    description,
    error, 
    size = 'md',
    labelPosition = 'right',
    className = '', 
    checked,
    disabled,
    ...props 
  }, ref) => {

    // 尺寸样式映射
    const sizeStyles = {
      sm: {
        container: 'h-5 w-9',
        thumb: 'h-3 w-3',
        translateX: 'translate-x-4'
      },
      md: {
        container: 'h-6 w-11', 
        thumb: 'h-4 w-4',
        translateX: 'translate-x-5'
      },
      lg: {
        container: 'h-7 w-12',
        thumb: 'h-5 w-5', 
        translateX: 'translate-x-5'
      }
    };

    const currentSize = sizeStyles[size];

    // 容器样式
    const containerStyles = `
      relative inline-flex items-center justify-start p-0.5
      ${currentSize.container}
      ${checked ? 'bg-indigo-600' : 'bg-gray-200'}
      border-2 border-transparent rounded-full cursor-pointer
      transition-all duration-200 ease-in-out
      focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
      ${error ? 'ring-2 ring-red-300' : ''}
    `;

    // 拇指样式
    const thumbStyles = `
      ${currentSize.thumb}
      bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out
      ${checked ? currentSize.translateX : 'translate-x-0'}
      pointer-events-none
    `;

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

    // Toggle视觉组件
    const ToggleVisual = () => (
      <div className={containerStyles}>
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          {...props}
        />
        <div className={thumbStyles} />
      </div>
    );

    // 标签内容组件
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

    // 渲染逻辑
    const renderToggle = () => {
      if (!label) {
        return <ToggleVisual />;
      }

      const flexDirection = labelPosition === 'left' ? 'flex-row-reverse' : 'flex-row';
      const spacing = labelPosition === 'left' ? 'space-x-reverse space-x-3' : 'space-x-3';

      return (
        <label className={`
          flex items-start ${flexDirection} ${spacing} cursor-pointer
          ${disabled ? 'cursor-not-allowed' : ''}
          ${className}
        `}>
          <ToggleVisual />
          <div className="flex-1">
            <LabelContent />
          </div>
        </label>
      );
    };

    return (
      <div className="space-y-1">
        {renderToggle()}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

PToggle.displayName = 'PToggle';

export default PToggle;
