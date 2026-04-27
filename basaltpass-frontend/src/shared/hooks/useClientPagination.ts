import { useCallback, useEffect, useMemo, useState } from 'react'

interface UseClientPaginationResult<T> {
  currentPage: number
  totalPages: number
  pageItems: T[]
  totalItems: number
  pageStart: number
  pageEnd: number
  setPage: (page: number) => void
  prevPage: () => void
  nextPage: () => void
  resetPage: () => void
}

export default function useClientPagination<T>(items: T[], pageSize: number): UseClientPaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.min(totalPages, Math.max(1, page)))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }, [])

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }, [totalPages])

  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + pageItems.length

  return {
    currentPage,
    totalPages,
    pageItems,
    totalItems,
    pageStart,
    pageEnd,
    setPage,
    prevPage,
    nextPage,
    resetPage,
  }
}
