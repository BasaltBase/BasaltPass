import React from 'react'

interface PManagementPageContainerProps {
  notice?: React.ReactNode
  header?: React.ReactNode
  toolbar?: React.ReactNode
  stats?: React.ReactNode
  filter?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function PManagementPageContainer({
  notice,
  header,
  toolbar,
  stats,
  filter,
  children,
  className = 'space-y-6',
}: PManagementPageContainerProps) {
  return (
    <div className={className}>
      {notice}
      {header}
      {toolbar}
      {stats}
      {filter}
      {children}
    </div>
  )
}
