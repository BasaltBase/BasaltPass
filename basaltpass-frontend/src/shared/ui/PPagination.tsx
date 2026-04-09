import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PPaginationProps {
  /** translated（translated1start） */
  currentPage: number
  /** translated */
  totalPages: number
  /** translated */
  onPageChange: (page: number) => void
  /** translated（cantranslated，translated "translated x-y translated，translated z translated"）*/
  total?: number
  /** translated（cantranslated，translated total translated） */
  pageSize?: number
  /** isnotranslatedinfotranslated */
  showInfo?: boolean
  /** isnotranslated */
  showPageNumbers?: boolean
  className?: string
}

const PPagination: React.FC<PPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  total,
  pageSize,
  showInfo = true,
  showPageNumbers = true,
  className = '',
}) => {
  if (totalPages <= 1 && !total) return null

  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  // translatedlist（translated）
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = []
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages)
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
    return pages
  }

  const btnBase =
    'relative inline-flex items-center px-3 py-2 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10'
  const btnActive = `${btnBase} z-10 bg-indigo-600 border-indigo-600 text-white`
  const btnInactive = `${btnBase} bg-white border-gray-300 text-gray-700 hover:bg-gray-50`
  const btnDisabled = `${btnBase} bg-white border-gray-200 text-gray-300 cursor-not-allowed`

  // infotranslated
  let infoText = ''
  if (showInfo && total !== undefined && pageSize !== undefined) {
    const from = (currentPage - 1) * pageSize + 1
    const to = Math.min(currentPage * pageSize, total)
    infoText = `translated ${from}–${to} translated，translated ${total} translated`
  } else if (showInfo && totalPages > 1) {
    infoText = `translated ${currentPage} translated，translated ${totalPages} translated`
  }

  return (
    <div className={`flex items-center justify-between py-3 ${className}`}>
      {/* translatedinfo */}
      <div className="text-sm text-gray-500">
        {infoText}
      </div>

      {/* translated */}
      <div className="flex items-center">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="translated">
          {/* translated */}
          <button
            type="button"
            onClick={() => canPrev && onPageChange(currentPage - 1)}
            disabled={!canPrev}
            className={`${canPrev ? btnInactive : btnDisabled} rounded-l-md`}
            aria-label="translated"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {/* translated */}
          {showPageNumbers && getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className={`${btnInactive} cursor-default select-none`}
              >
                ···
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={p === currentPage ? btnActive : btnInactive}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}

          {/* translated */}
          <button
            type="button"
            onClick={() => canNext && onPageChange(currentPage + 1)}
            disabled={!canNext}
            className={`${canNext ? btnInactive : btnDisabled} rounded-r-md`}
            aria-label="translated"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  )
}

PPagination.displayName = 'PPagination'

export default PPagination
