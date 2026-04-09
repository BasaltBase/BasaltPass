import { useState, useMemo } from 'react'
import Layout from '@features/user/components/Layout'
import { PInput, PButton } from '@ui'
import { useI18n } from '@shared/i18n'
import { 
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'

// FAQ
const faqCategories = [
  { id: 'all', nameKey: 'userHelp.categories.all', color: 'bg-gray-100 text-gray-800' },
  { id: 'account', nameKey: 'userHelp.categories.account', color: 'bg-blue-100 text-blue-800' },
  { id: 'security', nameKey: 'userHelp.categories.security', color: 'bg-green-100 text-green-800' },
  { id: 'payment', nameKey: 'userHelp.categories.payment', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'wallet', nameKey: 'userHelp.categories.wallet', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'subscription', nameKey: 'userHelp.categories.subscription', color: 'bg-red-100 text-red-800' }
]

const faqs = [
  {
    id: 1,
    category: 'account',
    questionKey: 'userHelp.faq.items.faq1.question',
    answerKey: 'userHelp.faq.items.faq1.answer',
    helpful: 45,
    notHelpful: 2
  },
  {
    id: 2,
    category: 'account',
    questionKey: 'userHelp.faq.items.faq2.question',
    answerKey: 'userHelp.faq.items.faq2.answer',
    helpful: 38,
    notHelpful: 1
  },
  {
    id: 3,
    category: 'security',
    questionKey: 'userHelp.faq.items.faq3.question',
    answerKey: 'userHelp.faq.items.faq3.answer',
    helpful: 52,
    notHelpful: 3
  },
  {
    id: 4,
    category: 'security',
    questionKey: 'userHelp.faq.items.faq4.question',
    answerKey: 'userHelp.faq.items.faq4.answer',
    helpful: 28,
    notHelpful: 5
  },
  {
    id: 5,
    category: 'payment',
    questionKey: 'userHelp.faq.items.faq5.question',
    answerKey: 'userHelp.faq.items.faq5.answer',
    helpful: 67,
    notHelpful: 4
  },
  {
    id: 6,
    category: 'payment',
    questionKey: 'userHelp.faq.items.faq6.question',
    answerKey: 'userHelp.faq.items.faq6.answer',
    helpful: 41,
    notHelpful: 2
  },
  {
    id: 7,
    category: 'wallet',
    questionKey: 'userHelp.faq.items.faq7.question',
    answerKey: 'userHelp.faq.items.faq7.answer',
    helpful: 34,
    notHelpful: 1
  },
  {
    id: 8,
    category: 'wallet',
    questionKey: 'userHelp.faq.items.faq8.question',
    answerKey: 'userHelp.faq.items.faq8.answer',
    helpful: 23,
    notHelpful: 3
  },
  {
    id: 9,
    category: 'subscription',
    questionKey: 'userHelp.faq.items.faq9.question',
    answerKey: 'userHelp.faq.items.faq9.answer',
    helpful: 31,
    notHelpful: 2
  },
  {
    id: 10,
    category: 'subscription',
    questionKey: 'userHelp.faq.items.faq10.question',
    answerKey: 'userHelp.faq.items.faq10.answer',
    helpful: 29,
    notHelpful: 1
  },
  {
    id: 11,
    category: 'security',
    questionKey: 'userHelp.faq.items.faq11.question',
    answerKey: 'userHelp.faq.items.faq11.answer',
    helpful: 56,
    notHelpful: 2
  },
  {
    id: 12,
    category: 'account',
    questionKey: 'userHelp.faq.items.faq12.question',
    answerKey: 'userHelp.faq.items.faq12.answer',
    helpful: 19,
    notHelpful: 1
  }
]

export default function Help() {
  const { t } = useI18n()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<number>>(new Set())
  const currentYear = new Date().getFullYear()

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const handleFeedback = (faqId: number, isHelpful: boolean) => {
    setFeedbackSubmitted(prev => new Set(prev).add(faqId))
    // 
    console.log(`FAQ ${faqId} feedback: ${isHelpful ? 'helpful' : 'not helpful'}`)
  }

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const question = t(faq.questionKey)
      const answer = t(faq.answerKey)
      const matchesSearch = question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           answer.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory, t])

  return (
    <Layout>
      <div className="space-y-6">
        {/*  */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('userHelp.title')}</h1>
        </div>

        {/*  */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-8">
            <div className="flex items-center mb-6">
              <MagnifyingGlassIcon className="h-6 w-6 text-blue-500 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">{t('userHelp.search.title')}</h3>
            </div>
            <div className="max-w-2xl mx-auto">
              <PInput
                placeholder={t('userHelp.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="lg"
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                variant="rounded"
              />
            </div>
          </div>
        </div>

        {/*  */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('userHelp.categories.title')}</h3>
            <div className="flex flex-wrap gap-3">
              {faqCategories.map((category) => (
                <PButton
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  variant={selectedCategory === category.id ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-full"
                >
                  {t(category.nameKey)}
                </PButton>
              ))}
            </div>
          </div>
        </div>

        {/*  */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {t('userHelp.faq.titleWithCount', { count: filteredFaqs.length })}
              </h3>
              {searchQuery && (
                <PButton
                  onClick={() => setSearchQuery('')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600"
                >
                  {t('userHelp.faq.clearSearch')}
                </PButton>
              )}
            </div>
            
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <QuestionMarkCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">{t('userHelp.empty.title')}</h4>
                <p className="text-gray-500">{t('userHelp.empty.description')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <PButton
                      onClick={() => toggleFaq(faq.id)}
                      variant="secondary"
                      className="w-full justify-between text-left px-6 py-4"
                    >
                      <div className="flex items-start space-x-4">
                        <div>
                          <span className="text-base font-medium text-gray-900">
                            {t(faq.questionKey)}
                          </span>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              faqCategories.find(c => c.id === faq.category)?.color || 'bg-gray-100 text-gray-800'
                            }`}>
                              {t(faqCategories.find(c => c.id === faq.category)?.nameKey || 'userHelp.categories.all')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`ml-6 flex-shrink-0 transform transition-transform duration-200 ${openFaq === faq.id ? 'rotate-180' : ''}`}>
                        <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </PButton>
                    {openFaq === faq.id && (
                      <div className="px-6 pb-4 bg-gray-50">
                        <div className="pt-4">
                          <p className="text-gray-700 leading-relaxed mb-4">{t(faq.answerKey)}</p>
                          
                          {!feedbackSubmitted.has(faq.id) ? (
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">{t('userHelp.feedback.question')}</span>
                              <PButton
                                onClick={() => handleFeedback(faq.id, true)}
                                variant="ghost"
                                size="sm"
                                leftIcon={<HandThumbUpIcon className="h-4 w-4" />}
                                className="text-green-600"
                              >
                                {t('userHelp.feedback.helpful')}
                              </PButton>
                              <PButton
                                onClick={() => handleFeedback(faq.id, false)}
                                variant="ghost"
                                size="sm"
                                leftIcon={<HandThumbDownIcon className="h-4 w-4" />}
                                className="text-red-600"
                              >
                                {t('userHelp.feedback.notHelpful')}
                              </PButton>
                            </div>
                          ) : (
                            <div className="flex items-center text-sm text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              <span>{t('userHelp.feedback.thanks')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/*  */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{t('userHelp.system.title')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('userHelp.system.description')}
                </p>
              </div>
              <div className="flex items-center">
                <div className="h-4 w-4 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">{t('userHelp.system.allServicesRunning')}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">{t('userHelp.system.services.api')}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">{t('userHelp.system.status.normal')}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">{t('userHelp.system.services.payment')}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">{t('userHelp.system.status.normal')}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">{t('userHelp.system.services.database')}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">{t('userHelp.system.status.normal')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2 text-center text-sm text-gray-500">
          <p>
            {t('userHelp.footer.copyrightPrefix', { year: currentYear })}
            <a
              href="https://hollowdata.com"
              target="_blank"
              rel="noreferrer"
              className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
            >
              HollowData
            </a>
            {t('userHelp.footer.copyrightSuffix')}
          </p>
        </div>

      </div>
    </Layout>
  )
} 
