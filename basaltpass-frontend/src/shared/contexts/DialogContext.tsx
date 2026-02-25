import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Modal from '@ui/common/Modal'
import PButton from '@ui/PButton'
import PInput from '@ui/PInput'

type DialogType = 'alert' | 'confirm' | 'prompt'

interface DialogRequest {
  type: DialogType
  title?: string
  message: string
  defaultValue?: string
  resolve: (value: boolean | string | null | void) => void
}

interface DialogContextValue {
  alert: (message: string, title?: string) => Promise<void>
  confirm: (message: string, title?: string) => Promise<boolean>
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

let dialogBridge: DialogContextValue | null = null

function fallbackModal(options: { message: string; title: string; type: DialogType; defaultValue?: string }) {
  return new Promise<boolean | string | null>((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;'

    const panel = document.createElement('div')
    panel.style.cssText = 'width:min(92vw,460px);background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;'

    const header = document.createElement('div')
    header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;'
    header.textContent = options.title

    const body = document.createElement('div')
    body.style.cssText = 'padding:16px 20px;color:#374151;line-height:1.6;'
    body.textContent = options.message

    const input = document.createElement('input')
    if (options.type === 'prompt') {
      input.value = options.defaultValue || ''
      input.style.cssText = 'width:100%;margin-top:12px;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;'
      body.appendChild(input)
    }

    const footer = document.createElement('div')
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid #e5e7eb;background:#f9fafb;'

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay)
      }
    }

    const cancel = document.createElement('button')
    cancel.textContent = '取消'
    cancel.style.cssText = 'padding:8px 14px;border:1px solid #d1d5db;background:#fff;border-radius:8px;cursor:pointer;'
    cancel.onclick = () => {
      cleanup()
      resolve(options.type === 'confirm' ? false : null)
    }

    const ok = document.createElement('button')
    ok.textContent = '确定'
    ok.style.cssText = 'padding:8px 14px;border:none;background:#2563eb;color:#fff;border-radius:8px;cursor:pointer;'
    ok.onclick = () => {
      cleanup()
      if (options.type === 'prompt') {
        resolve(input.value)
        return
      }
      resolve(true)
    }

    if (options.type !== 'alert') {
      footer.appendChild(cancel)
    }
    footer.appendChild(ok)

    panel.appendChild(header)
    panel.appendChild(body)
    panel.appendChild(footer)
    overlay.appendChild(panel)
    document.body.appendChild(overlay)

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cancel.click()
      }
    })
  })
}

export function uiAlert(message: string, title?: string) {
  if (dialogBridge) {
    void dialogBridge.alert(message, title)
    return
  }
  void fallbackModal({ type: 'alert', message, title: title || '提示' })
}

export function uiConfirm(message: string, title?: string): Promise<boolean> {
  if (dialogBridge) {
    return dialogBridge.confirm(message, title)
  }
  return fallbackModal({ type: 'confirm', message, title: title || '确认操作' }).then((value) => value === true)
}

export function uiPrompt(message: string, defaultValue?: string, title?: string): Promise<string | null> {
  if (dialogBridge) {
    return dialogBridge.prompt(message, defaultValue, title)
  }
  return fallbackModal({ type: 'prompt', message, defaultValue, title: title || '请输入' }).then((value) => {
    if (typeof value === 'string') {
      return value
    }
    return null
  })
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const queueRef = useRef<DialogRequest[]>([])
  const isShowingRef = useRef(false)
  const [active, setActive] = useState<DialogRequest | null>(null)
  const [promptValue, setPromptValue] = useState('')

  const popNext = useCallback(() => {
    const next = queueRef.current.shift() || null
    isShowingRef.current = !!next
    setActive(next)
    if (next?.type === 'prompt') {
      setPromptValue(next.defaultValue || '')
    } else {
      setPromptValue('')
    }
  }, [])

  const enqueue = useCallback((request: Omit<DialogRequest, 'resolve'>) => {
    return new Promise<boolean | string | null | void>((resolve) => {
      queueRef.current.push({ ...request, resolve })
      if (!isShowingRef.current) {
        popNext()
      }
    })
  }, [popNext])

  const api = useMemo<DialogContextValue>(() => ({
    alert: async (message: string, title = '提示') => {
      await enqueue({ type: 'alert', message, title })
    },
    confirm: async (message: string, title = '确认操作') => {
      const result = await enqueue({ type: 'confirm', message, title })
      return result === true
    },
    prompt: async (message: string, defaultValue = '', title = '请输入') => {
      const result = await enqueue({ type: 'prompt', message, defaultValue, title })
      if (typeof result === 'string') {
        return result
      }
      return null
    },
  }), [enqueue])

  dialogBridge = api

  const closeWith = (value: boolean | string | null | void) => {
    if (!active) {
      return
    }
    active.resolve(value)
    popNext()
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        open={!!active}
        title={active?.title || '提示'}
        onClose={() => closeWith(active?.type === 'confirm' ? false : null)}
        footer={(
          <div className="flex justify-end gap-3">
            {active?.type !== 'alert' && (
              <PButton type="button" variant="secondary" onClick={() => closeWith(active?.type === 'confirm' ? false : null)}>
                取消
              </PButton>
            )}
            <PButton
              type="button"
              variant={active?.type === 'alert' ? 'primary' : 'danger'}
              onClick={() => closeWith(active?.type === 'prompt' ? promptValue : true)}
            >
              确定
            </PButton>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{active?.message}</p>
          {active?.type === 'prompt' && (
            <PInput
              value={promptValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromptValue(e.target.value)}
              autoFocus
            />
          )}
        </div>
      </Modal>
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return context
}
