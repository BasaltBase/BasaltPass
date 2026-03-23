import React, {
  Children,
  forwardRef,
  isValidElement,
  SelectHTMLAttributes,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface PSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  variant?: 'default' | 'rounded' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
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
    disabled,
    onChange,
    value,
    defaultValue,
    name,
    id,
    ...props
  }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const options = useMemo<SelectOption[]>(() => {
      const items: SelectOption[] = [];

      Children.forEach(children, (child) => {
        if (!isValidElement(child) || child.type !== 'option') {
          return;
        }

        items.push({
          value: String(child.props.value ?? ''),
          label: child.props.children,
          disabled: Boolean(child.props.disabled),
        });
      });

      return items;
    }, [children]);

    const selectedValue = String(value ?? defaultValue ?? '');
    const selectedOption = options.find((option) => option.value === selectedValue);

    const baseStyles = `
      border transition-all duration-200 bg-white text-left
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
      disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
      disabled:border-gray-200
    `;

    const variantStyles = {
      default: 'border-gray-300 rounded-md shadow-sm',
      rounded: 'border-gray-200 rounded-xl shadow-sm',
      minimal: 'border-gray-200 rounded-lg bg-gray-50'
    };

    const sizeStyles = {
      sm: 'px-2 py-1 pr-8 text-sm',
      md: 'px-3 py-2 pr-10 text-sm',
      lg: 'px-4 py-3 pr-12 text-base'
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    const selectClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${widthStyles}
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      ${className}
    `.trim();

    const iconSize = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };

    const iconPosition = {
      sm: 'right-2',
      md: 'right-3',
      lg: 'right-4'
    };

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const handleOutsideClick = (event: MouseEvent) => {
        if (!wrapperRef.current?.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen]);

    const setSelectRef = (node: HTMLSelectElement | null) => {
      hiddenSelectRef.current = node;

      if (!ref) {
        return;
      }

      if (typeof ref === 'function') {
        ref(node);
        return;
      }

      ref.current = node;
    };

    const triggerChange = (nextValue: string) => {
      const selectElement = hiddenSelectRef.current;

      if (selectElement) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;

        valueSetter?.call(selectElement, nextValue);
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      const syntheticEvent = {
        target: { value: nextValue, name },
        currentTarget: { value: nextValue, name },
      } as React.ChangeEvent<HTMLSelectElement>;

      onChange?.(syntheticEvent);
    };

    const handleSelect = (nextValue: string) => {
      if (disabled) {
        return;
      }

      triggerChange(nextValue);
      setIsOpen(false);
    };

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div ref={wrapperRef} className="relative">
          <select
            ref={setSelectRef}
            id={selectId}
            name={name}
            value={selectedValue}
            disabled={disabled}
            onChange={onChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            {...props}
          >
            {children}
          </select>

          <button
            id={`${selectId}-trigger`}
            type="button"
            className={`${selectClasses} ${disabled ? '' : 'cursor-pointer'}`}
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={`${selectId}-trigger`}
          >
            <span className="block truncate">
              {selectedOption?.label ?? options[0]?.label ?? ''}
            </span>
          </button>

          <div className={`absolute inset-y-0 ${iconPosition[size]} flex items-center pointer-events-none`}>
            <ChevronDownIcon className={`${iconSize[size]} text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>

          {isOpen && !disabled && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              <ul role="listbox" aria-labelledby={`${selectId}-trigger`} className="py-1">
                {options.map((option) => {
                  const isSelected = option.value === selectedValue;

                  return (
                    <li key={`${selectId}-${option.value || 'empty'}`} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                          option.disabled
                            ? 'cursor-not-allowed text-gray-300'
                            : isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-900 hover:bg-indigo-50'
                        }`}
                        disabled={option.disabled}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleSelect(option.value);
                        }}
                      >
                        <span className="truncate">{option.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
