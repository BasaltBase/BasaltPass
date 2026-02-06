import { useCallback, useState } from 'react'

interface UsePaginationOptions {
  initialPage?: number
  pageSize?: number
  initialTotal?: number
}

export interface PaginationState {
  current: number
  pageSize: number
  total: number
}

export default function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, pageSize = 20, initialTotal = 0 } = options

  const [pagination, setPagination] = useState<PaginationState>({
    current: initialPage,
    pageSize,
    total: initialTotal
  })

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({
      ...prev,
      current: page
    }))
  }, [])

  const setTotal = useCallback((total: number) => {
    setPagination(prev => ({
      ...prev,
      total
    }))
  }, [])

  const resetPage = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      current: initialPage
    }))
  }, [initialPage])

  return {
    pagination,
    setPage,
    setTotal,
    resetPage
  }
}
