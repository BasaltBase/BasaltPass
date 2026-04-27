import { useMemo } from 'react'
import { type ManagedPaginationProps } from '@ui/PManagedTableSection'

interface PaginationMeta {
  currentPage: number
  totalPages: number
  start: number
  end: number
  total: number
}

interface UseManagedPaginationBarOptions {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  summary: (meta: PaginationMeta) => React.ReactNode
  pageInfo: (meta: PaginationMeta) => React.ReactNode
  className?: string
  enabled?: boolean
}

export default function useManagedPaginationBar({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  summary,
  pageInfo,
  className,
  enabled,
}: UseManagedPaginationBarOptions): ManagedPaginationProps | undefined {
  return useMemo(() => {
    const shouldEnable = enabled ?? totalItems > 0
    if (!shouldEnable) {
      return undefined
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
    const start = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
    const end = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems)
    const meta: PaginationMeta = {
      currentPage: safeCurrentPage,
      totalPages,
      start,
      end,
      total: totalItems,
    }

    return {
      className,
      summary: summary(meta),
      pageInfo: pageInfo(meta),
      currentPage: safeCurrentPage,
      totalPages,
      onPrev: () => onPageChange(Math.max(1, safeCurrentPage - 1)),
      onNext: () => onPageChange(Math.min(totalPages, safeCurrentPage + 1)),
    }
  }, [className, currentPage, enabled, onPageChange, pageInfo, pageSize, summary, totalItems])
}
