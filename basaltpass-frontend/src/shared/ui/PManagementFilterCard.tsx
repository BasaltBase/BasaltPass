import React from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import PInput from '@ui/PInput'

interface PManagementFilterCardProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  rightContent?: React.ReactNode
  rightContentClassName?: string
  className?: string
}

export default function PManagementFilterCard({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  rightContent,
  rightContentClassName = 'lg:w-64',
  className = '',
}: PManagementFilterCardProps) {
  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <PInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange((e.target as HTMLInputElement).value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5" />}
          />
        </div>
        {rightContent ? <div className={rightContentClassName}>{rightContent}</div> : null}
      </div>
    </div>
  )
}
