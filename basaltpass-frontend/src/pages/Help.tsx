import { useState } from 'react'
import Layout from '../components/Layout'
import { 
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

const faqs = [
  {
    question: '如何充值我的钱包？',
    answer: '您可以通过多种方式充值钱包：1. 使用支付宝扫码支付 2. 使用微信支付 3. 银行卡转账。充值通常在1-5分钟内到账。'
  },
  {
    question: '提现需要多长时间？',
    answer: '提现处理时间取决于您选择的提现方式：银行卡提现通常需要1-3个工作日，支付宝提现通常在24小时内到账。'
  },
  {
    question: '如何启用两步验证？',
    answer: '前往"安全设置"页面，点击"两步验证"选项，按照提示扫描二维码或输入密钥，然后输入验证码完成设置。'
  },
  {
    question: '忘记密码怎么办？',
    answer: '您可以通过邮箱或手机号重置密码。点击登录页面的"忘记密码"链接，按照提示操作即可。'
  },
  {
    question: '如何查看交易记录？',
    answer: '在钱包页面点击"交易记录"，或者在仪表板查看最近的交易。您可以按时间、类型或状态筛选交易记录。'
  },
  {
    question: '账户安全如何保障？',
    answer: '我们采用银行级别的安全措施：SSL加密传输、两步验证、实时监控异常登录、定期安全审计等。'
  }
]

const contactMethods = [
  {
    name: '在线客服',
    description: '24/7 在线支持',
    icon: ChatBubbleLeftRightIcon,
    action: '开始对话',
    href: '#'
  },
  {
    name: '邮件支持',
    description: 'support@basaltpass.com',
    icon: EnvelopeIcon,
    action: '发送邮件',
    href: 'mailto:support@basaltpass.com'
  },
  {
    name: '电话支持',
    description: '400-123-4567',
    icon: PhoneIcon,
    action: '拨打电话',
    href: 'tel:400-123-4567'
  },
  {
    name: '帮助文档',
    description: '详细使用指南',
    icon: DocumentTextIcon,
    action: '查看文档',
    href: '#'
  }
]

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">帮助中心</h1>
          <p className="mt-1 text-sm text-gray-500">
            找到您需要的答案和支持
          </p>
        </div>

        {/* 快速搜索 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">快速搜索</h3>
            </div>
            <div className="max-w-xl">
              <input
                type="text"
                placeholder="搜索问题或关键词..."
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* 常见问题 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              常见问题
            </h3>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <button
                    className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 "
                    onClick={() => toggleFaq(index)}
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {faq.question}
                    </span>
                    <span className="ml-6 flex-shrink-0">
                      <svg
                        className={`h-5 w-5 text-gray-500 transform ${
                          openFaq === index ? 'rotate-180' : ''
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </button>
                  {openFaq === index && (
                    <div className="px-4 pb-3">
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 联系支持 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              联系支持
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {contactMethods.map((method) => (
                <div
                  key={method.name}
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                >
                  <div className="flex-shrink-0">
                    <method.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={method.href} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      <p className="text-sm font-medium text-gray-900">
                        {method.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {method.description}
                      </p>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 使用指南 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              使用指南
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">注册账户</h4>
                </div>
                <p className="text-sm text-gray-600">
                  使用邮箱或手机号注册账户，完成身份验证
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">充值钱包</h4>
                </div>
                <p className="text-sm text-gray-600">
                  选择充值方式，输入金额，完成支付
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">开始使用</h4>
                </div>
                <p className="text-sm text-gray-600">
                  管理您的资金，查看交易记录，设置安全选项
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 系统状态 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  系统状态
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  查看服务运行状态
                </p>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-900">所有服务正常运行</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">API 服务</span>
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">支付系统</span>
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">数据库</span>
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">正常</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 