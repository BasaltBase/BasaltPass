import React from 'react'

export interface PManagementStatItem {
  key: string
  title: React.ReactNode
  value: React.ReactNode
  icon?: React.ReactNode
}

interface PManagementStatsGridProps {
  items: PManagementStatItem[]
  gridClassName?: string
}

export default function PManagementStatsGrid({
  items,
  gridClassName = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4',
}: PManagementStatsGridProps) {
  return (
    <div className={gridClassName}>
      {items.map((item) => (
        <div key={item.key} className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              {item.icon ? <div className="flex-shrink-0">{item.icon}</div> : null}
              <div className={item.icon ? 'ml-5 w-0 flex-1' : 'w-0 flex-1'}>
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">{item.title}</dt>
                  <dd className="text-lg font-medium text-gray-900">{item.value}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
