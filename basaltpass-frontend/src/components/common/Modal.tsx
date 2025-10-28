import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  widthClass?: string
  description?: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
  widthClass = 'max-w-lg',
  description
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-gray-900 bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className={`relative w-full mx-4 bg-white rounded-lg shadow-xl ${widthClass}`}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="关闭"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">{footer}</div>}
      </div>
    </div>
  )
}

export default Modal
