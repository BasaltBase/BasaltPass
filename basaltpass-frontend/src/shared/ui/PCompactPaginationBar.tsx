import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import PButton from '@ui/PButton'

interface PCompactPaginationBarProps {
  summary: React.ReactNode
  pageInfo: React.ReactNode
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  className?: string
}

export default function PCompactPaginationBar({
  summary,
  pageInfo,
  currentPage,
  totalPages,
  onPrev,
  onNext,
  className = '',
}: PCompactPaginationBarProps) {
  return (
    <div className={`mt-4 rounded-xl bg-white px-6 py-4 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-sm text-gray-700">{summary}</div>
        <div className="flex flex-wrap items-center gap-2">
          <PButton variant="secondary" size="sm" onClick={onPrev} disabled={currentPage <= 1}>
            <ChevronLeftIcon className="h-4 w-4" />
          </PButton>
          <span className="px-3 py-1 text-sm text-center">{pageInfo}</span>
          <PButton variant="secondary" size="sm" onClick={onNext} disabled={currentPage >= totalPages}>
            <ChevronRightIcon className="h-4 w-4" />
          </PButton>
        </div>
      </div>
    </div>
  )
}
