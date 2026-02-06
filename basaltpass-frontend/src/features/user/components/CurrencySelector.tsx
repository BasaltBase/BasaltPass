import { useState, useEffect } from 'react'
import { getCurrencies, Currency } from '@api/user/currency'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface CurrencySelectorProps {
  value: string
  onChange: (currency: Currency) => void
  className?: string
}

export default function CurrencySelector({ value, onChange, className = '' }: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrencies()
  }, [])

  const loadCurrencies = async () => {
    try {
      const response = await getCurrencies()
      setCurrencies(response.data)
      // 只有在没有选中货币且有可用货币时，才设置默认货币
      if (!value && response.data.length > 0) {
        const defaultCurrency = response.data.find(c => c.code === 'USD') || response.data[0]
        onChange(defaultCurrency)
      }
    } catch (error) {
      console.error('Failed to load currencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedCurrency = currencies.find(c => c.code === value)

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-md h-10 ${className}`}></div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <span className="flex items-center">
          {selectedCurrency ? (
            <>
              <span className="text-lg mr-2">{selectedCurrency.symbol}</span>
              <span className="block truncate">
                {selectedCurrency.name_cn || selectedCurrency.name} ({selectedCurrency.code})
              </span>
            </>
          ) : (
            <span className="block truncate text-gray-400">选择货币</span>
          )}
        </span>
        <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {currencies.map((currency) => (
            <div
              key={currency.id}
              onClick={() => {
                onChange(currency)
                setIsOpen(false)
              }}
              className={`cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 ${
                value === currency.code ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
              }`}
            >
              <div className="flex items-center">
                <span className="text-lg mr-2">{currency.symbol}</span>
                <span className="block truncate">
                  {currency.name_cn || currency.name} ({currency.code})
                </span>
                {currency.type === 'crypto' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    加密
                  </span>
                )}
                {currency.type === 'points' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    积分
                  </span>
                )}
              </div>
              {currency.description && (
                <p className="text-gray-500 text-xs mt-1 ml-7">{currency.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
