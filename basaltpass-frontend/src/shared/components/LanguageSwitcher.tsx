import { PButton } from '@ui'
import { useI18n } from '@shared/i18n'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white">
      <PButton
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('en')}
        className={`rounded-none px-2 py-1 text-xs ${language === 'en' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}
      >
        EN
      </PButton>
      <PButton
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('zh')}
        className={`rounded-none border-l border-gray-200 px-2 py-1 text-xs ${language === 'zh' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}
      >
        chinese
      </PButton>
    </div>
  )
}
