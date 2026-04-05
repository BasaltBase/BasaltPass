import { EnvelopeIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'
import type { TwoFactorMethod } from './types'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

interface TwoFactorPresentation {
  icon: IconType
  label: string
}

const DEFAULT_PRESENTATION: TwoFactorPresentation = {
  icon: KeyIcon,
  label: '',
}

const PRESENTATION_BY_METHOD: Record<string, TwoFactorPresentation> = {
  totp: {
    icon: KeyIcon,
    label: '验证器应用 (TOTP)',
  },
  passkey: {
    icon: ShieldCheckIcon,
    label: 'Passkey (生物识别)',
  },
  email: {
    icon: EnvelopeIcon,
    label: '邮箱验证码',
  },
}

export function getTwoFactorPresentation(method: TwoFactorMethod): TwoFactorPresentation {
  const presentation = PRESENTATION_BY_METHOD[method]
  if (presentation) {
    return presentation
  }

  return {
    ...DEFAULT_PRESENTATION,
    label: method,
  }
}
