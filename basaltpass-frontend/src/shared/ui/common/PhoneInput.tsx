import React, { useState, useEffect } from 'react'
import { PhoneIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { phoneValidator, formatPhoneForDisplay } from '../../utils/phoneValidator'

interface PhoneInputProps {
  value: string
  onChange: (value: string, isValid: boolean) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  required?: boolean
  className?: string
  showValidation?: boolean
  defaultCountryCode?: string
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "请输入手机号码",
  disabled = false,
  label,
  required = false,
  className = "",
  showValidation = true,
  defaultCountryCode = "+86"
}: PhoneInputProps) {
  const [inputValue, setInputValue] = useState(value || '')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string>('')
  const [isFocused, setIsFocused] = useState(false)

  // 使用指定的默认国家代码创建验证器
  const validator = React.useMemo(
    () => new (phoneValidator.constructor as any)(defaultCountryCode),
    [defaultCountryCode]
  )

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '')
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setInputValue(rawValue)

    if (!rawValue.trim()) {
      setIsValid(null)
      setError('')
      onChange('', false)
      return
    }

    // 尝试标准化为E.164格式
    const result = validator.normalizeToE164(rawValue)
    if (result.error) {
      setIsValid(false)
      setError(result.error)
      onChange(rawValue, false)
    } else {
      setIsValid(true)
      setError('')
      onChange(result.phone!, true)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
    
    // 失焦时如果有有效的手机号，格式化显示
    if (isValid && inputValue) {
      const result = validator.normalizeToE164(inputValue)
      if (result.phone) {
        const formatted = formatPhoneForDisplay(result.phone)
        setInputValue(formatted)
      }
    }
  }

  const getValidationIcon = () => {
    if (!showValidation || isValid === null) return null
    
    if (isValid) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    } else {
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
    }
  }

  const getInputClassName = () => {
    let baseClass = `block w-full px-4 py-3 pl-12 pr-12 border rounded-lg shadow-sm 
                     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                     transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white`
    
    if (disabled) {
      baseClass += ' bg-gray-50 text-gray-500 cursor-not-allowed'
    } else {
      baseClass += ' hover:border-gray-300'
    }

    if (showValidation && isValid === false) {
      baseClass += ' border-red-300 focus:border-red-500 focus:ring-red-500'
    } else if (showValidation && isValid === true) {
      baseClass += ' border-green-300 focus:border-green-500 focus:ring-green-500'
    } else {
      baseClass += ' border-gray-200'
    }

    return `${baseClass} ${className}`
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center text-sm font-semibold text-gray-700">
          <PhoneIcon className="h-5 w-5 mr-2 text-indigo-500" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <PhoneIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="tel"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClassName()}
          autoComplete="tel"
        />
        
        {showValidation && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {getValidationIcon()}
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {showValidation && error && (
        <p className="text-sm text-red-600 flex items-center mt-1">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}

      {/* 帮助提示 */}
      {!error && isFocused && (
        <p className="text-sm text-gray-500 mt-1">
          支持国际格式，如 +8613812345678 或 13812345678
        </p>
      )}
    </div>
  )
}

export default PhoneInput