import React from 'react'
import PTable, { type PTableAction, type PTableColumn } from '@ui/PTable'
import PCompactPaginationBar from '@ui/PCompactPaginationBar'

export interface ManagedPaginationProps {
  summary: React.ReactNode
  pageInfo: React.ReactNode
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  className?: string
}

export interface PManagedTableSectionProps<T> {
  data: T[]
  columns: PTableColumn<T>[]
  rowKey: (row: T, index: number) => string | number
  actions?: PTableAction<T>[]
  loading?: boolean
  emptyText?: string
  emptyContent?: React.ReactNode
  striped?: boolean
  size?: 'sm' | 'md' | 'lg'
  defaultSort?: { key: string; order: 'asc' | 'desc' }
  pagination?: ManagedPaginationProps
}

export default function PManagedTableSection<T>({
  data,
  columns,
  rowKey,
  actions,
  loading,
  emptyText,
  emptyContent,
  striped,
  size,
  defaultSort,
  pagination,
}: PManagedTableSectionProps<T>) {
  return (
    <div>
      <PTable<T>
        data={data}
        columns={columns}
        actions={actions}
        rowKey={rowKey}
        loading={loading}
        emptyText={emptyText}
        emptyContent={emptyContent}
        striped={striped}
        size={size}
        defaultSort={defaultSort}
      />

      {pagination ? (
        <PCompactPaginationBar
          className={pagination.className}
          summary={pagination.summary}
          pageInfo={pagination.pageInfo}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPrev={pagination.onPrev}
          onNext={pagination.onNext}
        />
      ) : null}
    </div>
  )
}
