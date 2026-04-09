import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './messages/en'
import zh from './messages/zh'

export type AppLanguage = 'en' | 'zh'

type TranslateParams = Record<string, string | number>

interface I18nContextValue {
  language: AppLanguage
  locale: string
  setLanguage: (lang: AppLanguage) => void
  t: (key: string, params?: TranslateParams) => string
  toggleLanguage: () => void
}

const STORAGE_KEY = 'bp_locale'

const resources: Record<AppLanguage, Record<string, any>> = {
  en,
  zh,
}

function normalizeLanguage(value?: string | null): AppLanguage {
  const raw = (value || '').toLowerCase()
  if (raw.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

function getByPath(source: Record<string, any>, path: string): string | undefined {
  const parts = path.split('.')
  let current: any = source
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved) {
    return normalizeLanguage(saved)
  }

  return normalizeLanguage(window.navigator.language)
}

function languageToLocale(language: AppLanguage): string {
  return language === 'zh' ? 'zh-CN' : 'en-US'
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getInitialLanguage())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language)
      document.documentElement.lang = language
    }
  }, [language])

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'en' ? 'zh' : 'en'))
  }, [])

  const t = useCallback((key: string, params?: TranslateParams) => {
    const primary = getByPath(resources[language], key)
    const fallback = getByPath(resources.en, key)
    const resolved = primary ?? fallback ?? key
    return interpolate(resolved, params)
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    locale: languageToLocale(language),
    setLanguage,
    t,
    toggleLanguage,
  }), [language, setLanguage, t, toggleLanguage])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function useLocale() {
  const { locale } = useI18n()
  return locale
}

export function formatDateTime(value: string | number | Date, locale: string) {
  return new Date(value).toLocaleString(locale)
}

export function formatDate(value: string | number | Date, locale: string) {
  return new Date(value).toLocaleDateString(locale)
}

export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value)
}
