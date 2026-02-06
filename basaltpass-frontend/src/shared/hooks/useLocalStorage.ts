import { useCallback, useEffect, useState } from 'react'

export default function useLocalStorage<T>(key: string, initialValue: T) {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.warn(`Failed to read localStorage key "${key}":`, error)
      return initialValue
    }
  }, [initialValue, key])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  useEffect(() => {
    setStoredValue(readValue())
  }, [readValue])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.warn(`Failed to set localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue] as const
}
