import { useState, useMemo } from 'react'
import Layout from '@features/user/components/Layout'
import { PInput, PButton } from '@ui'
import { 
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'

// FAQ分类
const faqCategories = [
  { id: 'all', name: '全部', color: 'bg-gray-100 text-gray-800' },
  { id: 'account', name: '账户管理', color: 'bg-blue-100 text-blue-800' },
  { id: 'security', name: '安全设置', color: 'bg-green-100 text-green-800' },
  { id: 'payment', name: '支付充值', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'wallet', name: '钱包管理', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'subscription', name: '订阅服务', color: 'bg-red-100 text-red-800' }
]

const faqs = [
  {
    id: 1,
    category: 'account',
    question: '如何注册新账户？',
    answer: '点击页面右上角的"注册"按钮，输入您的邮箱地址和密码，完成邮箱验证即可创建账户。您也可以使用手机号注册。',
    helpful: 45,
    notHelpful: 2
  },
  {
    id: 2,
    category: 'account',
    question: '忘记密码怎么办？',
    answer: '您可以通过邮箱或手机号重置密码。点击登录页面的"忘记密码"链接，按照提示操作即可。重置链接有效期为30分钟。',
    helpful: 38,
    notHelpful: 1
  },
  {
    id: 3,
    category: 'security',
    question: '如何启用两步验证？',
    answer: '前往"安全设置"页面，点击"两步验证"选项，按照提示扫描二维码或输入密钥，然后输入验证码完成设置。建议同时启用备用验证方式。',
    helpful: 52,
    notHelpful: 3
  },
  {
    id: 4,
    category: 'security',
    question: '如何设置Passkey？',
    answer: '在安全设置页面选择"Passkey管理"，点击"添加Passkey"，按照浏览器提示完成生物识别或PIN码设置。Passkey提供更安全的无密码登录体验。',
    helpful: 28,
    notHelpful: 5
  },
  {
    id: 5,
    category: 'payment',
    question: '如何充值我的钱包？',
    answer: '您可以通过多种方式充值钱包：1. 使用支付宝扫码支付 2. 使用微信支付 3. 银行卡转账。充值通常在1-5分钟内到账，大额充值可能需要人工审核。',
    helpful: 67,
    notHelpful: 4
  },
  {
    id: 6,
    category: 'payment',
    question: '提现需要多长时间？',
    answer: '提现处理时间取决于您选择的提现方式：银行卡提现通常需要1-3个工作日，支付宝提现通常在24小时内到账。单笔提现限额为50,000元。',
    helpful: 41,
    notHelpful: 2
  },
  {
    id: 7,
    category: 'wallet',
    question: '如何查看交易记录？',
    answer: '在钱包页面点击"交易记录"，或者在仪表板查看最近的交易。您可以按时间、类型或状态筛选交易记录，支持导出CSV格式。',
    helpful: 34,
    notHelpful: 1
  },
  {
    id: 8,
    category: 'wallet',
    question: '钱包余额不足怎么办？',
    answer: '当钱包余额不足时，系统会提示您充值。您也可以设置自动充值功能，当余额低于设定阈值时自动充值指定金额。',
    helpful: 23,
    notHelpful: 3
  },
  {
    id: 9,
    category: 'subscription',
    question: '如何管理订阅计划？',
    answer: '在订阅页面可以查看当前计划、升级或降级计划、取消订阅等。取消订阅后，服务将在当前计费周期结束后停止。',
    helpful: 31,
    notHelpful: 2
  },
  {
    id: 10,
    category: 'subscription',
    question: '订阅费用如何计算？',
    answer: '订阅费用按选择的计划按月或按年收取。年付计划通常有折扣优惠。费用会在每个计费周期开始时自动从钱包扣除。',
    helpful: 29,
    notHelpful: 1
  },
  {
    id: 11,
    category: 'security',
    question: '账户安全如何保障？',
    answer: '我们采用银行级别的安全措施：SSL加密传输、两步验证、实时监控异常登录、定期安全审计、数据备份等。所有敏感数据都经过加密存储。',
    helpful: 56,
    notHelpful: 2
  },
  {
    id: 12,
    category: 'account',
    question: '如何修改个人信息？',
    answer: '在个人资料页面可以修改头像、昵称、邮箱、手机号等个人信息。修改敏感信息时需要验证身份。',
    helpful: 19,
    notHelpful: 1
  }
]

export default function Help() {
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
    // 这里可以发送反馈到后端
    console.log(`FAQ ${faqId} feedback: ${isHelpful ? 'helpful' : 'not helpful'}`)
  }

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">帮助中心</h1>
        </div>

        {/* 快速搜索 */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-8">
            <div className="flex items-center mb-6">
              <MagnifyingGlassIcon className="h-6 w-6 text-blue-500 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">搜索帮助</h3>
            </div>
            <div className="max-w-2xl mx-auto">
              <PInput
                placeholder="搜索问题或关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="lg"
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                variant="rounded"
              />
            </div>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">按分类浏览</h3>
            <div className="flex flex-wrap gap-3">
              {faqCategories.map((category) => (
                <PButton
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  variant={selectedCategory === category.id ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-full"
                >
                  {category.name}
                </PButton>
              ))}
            </div>
          </div>
        </div>

        {/* 常见问题 */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                常见问题 ({filteredFaqs.length})
              </h3>
              {searchQuery && (
                <PButton
                  onClick={() => setSearchQuery('')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600"
                >
                  清除搜索
                </PButton>
              )}
            </div>
            
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <QuestionMarkCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">未找到相关问题</h4>
                <p className="text-gray-500">尝试使用不同的关键词或联系我们的客服团队</p>
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
                            {faq.question}
                          </span>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              faqCategories.find(c => c.id === faq.category)?.color || 'bg-gray-100 text-gray-800'
                            }`}>
                              {faqCategories.find(c => c.id === faq.category)?.name}
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
                          <p className="text-gray-700 leading-relaxed mb-4">{faq.answer}</p>
                          
                          {!feedbackSubmitted.has(faq.id) ? (
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">这个回答对您有帮助吗？</span>
                              <PButton
                                onClick={() => handleFeedback(faq.id, true)}
                                variant="ghost"
                                size="sm"
                                leftIcon={<HandThumbUpIcon className="h-4 w-4" />}
                                className="text-green-600"
                              >
                                有帮助
                              </PButton>
                              <PButton
                                onClick={() => handleFeedback(faq.id, false)}
                                variant="ghost"
                                size="sm"
                                leftIcon={<HandThumbDownIcon className="h-4 w-4" />}
                                className="text-red-600"
                              >
                                没帮助
                              </PButton>
                            </div>
                          ) : (
                            <div className="flex items-center text-sm text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              <span>感谢您的反馈！</span>
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

        {/* 系统状态 */}
        <div className="bg-white shadow-lg rounded-xl">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">系统状态</h3>
                <p className="mt-1 text-sm text-gray-500">
                  实时查看服务运行状态
                </p>
              </div>
              <div className="flex items-center">
                <div className="h-4 w-4 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">所有服务正常运行</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">API 服务</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">支付系统</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">数据库</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">正常</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2 text-center text-sm text-gray-500">
          <p>
            Copyright 2024 - {currentYear} BasaltPass BasaltBase powered by{' '}
            <a
              href="https://hollowdata.com"
              target="_blank"
              rel="noreferrer"
              className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
            >
              HollowData
            </a>
          </p>
        </div>

      </div>
    </Layout>
  )
} 
