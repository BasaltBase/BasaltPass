import React, {
  forwardRef,
  SelectHTMLAttributes,
  useId,
  useState,
  useRef,
  useEffect,
  Children,
  isValidElement,
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

const PSelect = forwardRef<HTMLSelectElement, PSelectProps>(
  (
    {
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
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(
      defaultValue !== undefined ? String(defaultValue) : '',
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? String(value) : internalValue;

    // Parse <option> children into a flat list
    type OptionItem = { value: string; label: React.ReactNode; disabled?: boolean };
    const options: OptionItem[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === 'option') {
        const p = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
        options.push({
          value: String(p.value ?? ''),
          label: p.children,
          disabled: p.disabled,
        });
      }
    });

    const selectedOption = options.find((o) => o.value === currentValue);

    // ------- style maps -------
    const triggerSizeClasses = {
      sm: 'px-2 py-1 text-sm min-h-[2rem]',
      md: 'px-3 py-2 text-sm min-h-[2.375rem]',
      lg: 'px-4 py-3 text-base min-h-[2.875rem]',
    };
    const iconSize = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };
    const variantClasses = {
      default: 'border-gray-300 rounded-lg shadow-sm',
      rounded: 'border-gray-200 rounded-xl shadow-sm',
      minimal: 'border-gray-200 rounded-lg bg-gray-50',
    };

    const triggerClasses = [
      'relative flex items-center justify-between gap-2',
      'w-full border bg-white text-left',
      'transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
      variantClasses[variant],
      triggerSizeClasses[size],
      error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
      disabled
        ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200 opacity-70'
        : 'cursor-pointer hover:border-gray-400',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // ------- selection handler -------
    const handleSelect = (optValue: string, optDisabled?: boolean) => {
      if (optDisabled) return;
      if (!isControlled) {
        setInternalValue(optValue);
      }
      setIsOpen(false);
      if (onChange) {
        // Simulate React.ChangeEvent<HTMLSelectElement> — callers only access e.target.value
        const fakeEvent = {
          target: { value: optValue, name: name ?? '' } as EventTarget & HTMLSelectElement,
          currentTarget: { value: optValue, name: name ?? '' } as EventTarget & HTMLSelectElement,
          bubbles: true,
          cancelable: false,
          type: 'change',
          nativeEvent: new Event('change'),
          isDefaultPrevented: () => false,
          isPropagationStopped: () => false,
          defaultPrevented: false,
          persist: () => {},
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(fakeEvent);
      }
    };

    // ------- close on outside click -------
    useEffect(() => {
      if (!isOpen) return;
      const handleOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      // translated click（translated mousedown）translated，translatedandtranslated onClick translated
      document.addEventListener('click', handleOutside);
      return () => document.removeEventListener('click', handleOutside);
    }, [isOpen]);

    // ------- close on Escape -------
    useEffect(() => {
      if (!isOpen) return;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    return (
      <div className="space-y-1" ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}

        <div className="relative">
          {/* Hidden native select — form submission & ref forwarding */}
          <select
            ref={ref}
            name={name}
            value={currentValue}
            onChange={() => {
              /* controlled by custom UI */
            }}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>

          {/* Custom trigger */}
          <button
            id={selectId}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            className={triggerClasses}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? selectId : undefined}
          >
            <span
              className={
                !selectedOption || selectedOption.value === ''
                  ? 'text-gray-400 truncate flex-1'
                  : 'text-gray-900 truncate flex-1'
              }
            >
              {selectedOption?.label ?? (options[0]?.label || '')}
            </span>
            <ChevronDownIcon
              className={`${iconSize[size]} flex-shrink-0 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown list */}
          {isOpen && (
            <ul
              role="listbox"
              aria-activedescendant={currentValue ? `${selectId}-opt-${currentValue}` : undefined}
              className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1 focus:outline-none"
            >
              {options.map((opt) => {
                const isSelected = opt.value === currentValue;
                return (
                  <li
                    key={opt.value}
                    id={`${selectId}-opt-${opt.value}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      handleSelect(opt.value, opt.disabled);
                    }}
                    className={[
                      'px-3 py-2 text-sm select-none',
                      opt.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-900 cursor-pointer',
                      isSelected ? 'bg-indigo-50 font-medium text-indigo-700' : '',
                      !isSelected && !opt.disabled ? 'hover:bg-gray-100' : '',
                    ]
                      .join(' ')
                      .trim()}
                  >
                    {opt.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

PSelect.displayName = 'PSelect';

export default PSelect;
