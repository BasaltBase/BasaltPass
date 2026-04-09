import { EnvelopeIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'
import type { TwoFactorMethod } from './types'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

interface TwoFactorPresentation {
  icon: IconType
  labelKey: string
}

const DEFAULT_PRESENTATION: TwoFactorPresentation = {
  icon: KeyIcon,
  labelKey: 'auth.twoFactor.methods.unknown',
}

const PRESENTATION_BY_METHOD: Record<string, TwoFactorPresentation> = {
  totp: {
    icon: KeyIcon,
    labelKey: 'auth.twoFactor.methods.totp',
  },
  passkey: {
    icon: ShieldCheckIcon,
    labelKey: 'auth.twoFactor.methods.passkey',
  },
  email: {
    icon: EnvelopeIcon,
    labelKey: 'auth.twoFactor.methods.email',
  },
}

export function getTwoFactorPresentation(method: TwoFactorMethod): TwoFactorPresentation {
  const presentation = PRESENTATION_BY_METHOD[method]
  if (presentation) {
    return presentation
  }

  return {
    ...DEFAULT_PRESENTATION,
    labelKey: 'auth.twoFactor.methods.unknown',
  }
}
