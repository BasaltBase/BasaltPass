import React, { useMemo, useState } from 'react';
import PButton from '@ui/PButton';

export type Align = 'left' | 'center' | 'right';

export interface PTableColumn<T> {
  key: string;
  title: React.ReactNode;
  dataIndex?: keyof T & string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  align?: Align;
  sortable?: boolean;
  sorter?: (a: T, b: T) => number; // custom compare function
}

export interface PTableAction<T> {
  key: string;
  label: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  confirm?: string; // optional confirmation message
  disabled?: boolean;
}

export interface PTableProps<T> {
  columns: Array<PTableColumn<T>>;
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  actions?: Array<PTableAction<T>>;
  loading?: boolean;
  emptyText?: string;
  emptyContent?: React.ReactNode; // custom node shown with empty state
  striped?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  defaultSort?: { key: string; order: 'asc' | 'desc' };
  sortState?: { key: string; order: 'asc' | 'desc' };
  onSortChange?: (state: { key: string; order: 'asc' | 'desc' } | undefined) => void;
}

function sizePadding(size: 'sm' | 'md' | 'lg' = 'md') {
  switch (size) {
    case 'sm':
      return 'px-3 py-2';
    case 'lg':
      return 'px-6 py-4';
    case 'md':
    default:
      return 'px-4 py-3';
  }
}

function alignClass(align: Align = 'left') {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    case 'left':
    default:
      return 'text-left';
  }
}

const PTable = <T extends unknown>({
  columns,
  data,
  rowKey,
  actions = [],
  loading = false,
  emptyText = '暂无数据',
  emptyContent,
  striped = true,
  size = 'md',
  className = '',
  defaultSort,
  sortState,
  onSortChange,
}: PTableProps<T>) => {
  const cellPadding = sizePadding(size);

  // Sorting state (uncontrolled if sortState not provided)
  const [innerSort, setInnerSort] = useState<{ key: string; order: 'asc' | 'desc' } | undefined>(defaultSort);
  const currentSort = sortState ?? innerSort;

  const sortedData = useMemo(() => {
    // 安全检查：确保 data 是数组
    if (!Array.isArray(data)) {
      console.warn('PTable: data prop is not an array:', data)
      return []
    }
    if (!currentSort) return data;
    const col = columns.find(c => c.key === currentSort.key);
    if (!col || !col.sortable) return data;
    const copy = [...data];
    const compare = (a: T, b: T) => {
      if (col.sorter) return col.sorter(a, b);
      // default compare by dataIndex if present
      const di = col.dataIndex as string | undefined;
      const av = di ? (a as any)[di] : undefined;
      const bv = di ? (b as any)[di] : undefined;
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      const as = String(av);
      const bs = String(bv);
      return as.localeCompare(bs, 'zh-CN');
    };
    copy.sort((a, b) => (currentSort.order === 'asc' ? compare(a, b) : -compare(a, b)));
    return copy;
  }, [data, columns, currentSort]);

  const toggleSort = (key: string, enabled: boolean) => {
    if (!enabled) return;
    let next: { key: string; order: 'asc' | 'desc' } | undefined;
    if (!currentSort || currentSort.key !== key) {
      next = { key, order: 'asc' };
    } else if (currentSort.order === 'asc') {
      next = { key, order: 'desc' };
    } else {
      next = undefined; // clear sort
    }
    if (onSortChange) onSortChange(next);
    else setInnerSort(next);
  };

  return (
    <div className={`bg-white shadow overflow-hidden sm:rounded-lg ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => {
                const isSorted = currentSort && currentSort.key === col.key;
                const sortOrder = isSorted ? currentSort!.order : undefined;
                const sortable = !!col.sortable;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`${cellPadding} ${alignClass(col.align)} text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''} ${sortable ? 'cursor-pointer select-none' : ''}`}
                    onClick={() => toggleSort(col.key, sortable)}
                  >
                    <div className="inline-flex items-center space-x-1">
                      <span>{col.title}</span>
                      {sortable && (
                        <span className="text-gray-400">
                          {sortOrder === 'asc' ? '▲' : sortOrder === 'desc' ? '▼' : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              {actions.length > 0 && (
                <th
                  scope="col"
                  className={`${cellPadding} ${alignClass('right')} text-xs font-medium text-gray-500 uppercase tracking-wider`}
                >
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className={`${cellPadding}`}>
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className={`${cellPadding}`}>
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">{emptyText}</p>
                    {emptyContent && <div className="mt-4">{emptyContent}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr key={String(rowKey(row, index))} className={striped && index % 2 === 1 ? 'bg-gray-50' : ''}>
                  {columns.map((col) => (
                    <td key={col.key} className={`${cellPadding} ${alignClass(col.align)} text-sm text-gray-900 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row, index)
                        : col.dataIndex
                        ? String((row as any)[col.dataIndex] ?? '')
                        : null}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className={`${cellPadding} ${alignClass('right')}`}>
                      <div className="flex items-center justify-end space-x-2">
                        {actions.map((action) => {
                          const handleClick = () => {
                            if (action.confirm) {
                              if (!window.confirm(action.confirm)) return;
                            }
                            action.onClick(row);
                          };
                          return (
                            <PButton
                              key={action.key}
                              type="button"
                              size={action.size || 'sm'}
                              variant={action.variant || 'secondary'}
                              onClick={handleClick}
                              disabled={action.disabled}
                              leftIcon={action.icon}
                            >
                              {action.label}
                            </PButton>
                          );
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PTable;
