import { useCallback } from 'react'

export default function useQueryString() {
  const get = useCallback((key: string) => {
    const params = new URLSearchParams(window.location.search)
    return params.get(key)
  }, [])

  const set = useCallback((key: string, value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set(key, value)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const remove = useCallback((key: string) => {
    const url = new URL(window.location.href)
    url.searchParams.delete(key)
    window.history.replaceState({}, '', url.toString())
  }, [])

  return { get, set, remove }
}
