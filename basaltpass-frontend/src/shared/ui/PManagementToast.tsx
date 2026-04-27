import React from 'react'
import { CheckIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import PButton from '@ui/PButton'

interface PManagementToastProps {
  visible: boolean
  type: 'success' | 'error' | 'info'
  text: string
  onClose: () => void
}

export default function PManagementToast({ visible, type, text, onClose }: PManagementToastProps) {
  if (!visible) {
    return null
  }

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center space-x-2 rounded-lg p-4 text-white shadow-lg ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
      }`}
    >
      {type === 'success' ? <CheckIcon className="h-5 w-5" /> : null}
      {type === 'error' ? <ExclamationTriangleIcon className="h-5 w-5" /> : null}
      <span>{text}</span>
      <PButton variant="ghost" size="sm" onClick={onClose} className="ml-2">
        <XMarkIcon className="h-4 w-4" />
      </PButton>
    </div>
  )
}
