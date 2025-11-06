import { useState } from 'react'
import Layout from '../../components/Layout'
import { PSelect, PCard, PToggle, PButton } from '../../components'
import { 
  UserIcon, 
  BellIcon, 
  ShieldCheckIcon,
  GlobeAltIcon,
  CreditCardIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    security: true
  })

  const [language, setLanguage] = useState('zh-CN')
  const [timezone, setTimezone] = useState('Asia/Shanghai')

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理您的账户设置和偏好
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* 区域设置 */}
          <PCard>
            <div className="flex items-center mb-4">
              <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">区域设置</h3>
            </div>
              <div className="space-y-4">
                <div>
                  <PSelect
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    label="语言"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                    <option value="ja-JP">日本語</option>
                  </PSelect>
                </div>
                <div>
                  <PSelect
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    label="时区"
                  >
                    <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
                    <option value="America/New_York">美国东部时间 (UTC-5)</option>
                    <option value="Europe/London">格林威治标准时间 (UTC+0)</option>
                  </PSelect>
                </div>
                <div>
                  <PSelect label="货币">
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="USD">美元 (USD)</option>
                    <option value="EUR">欧元 (EUR)</option>
                    <option value="JPY">日元 (JPY)</option>
                  </PSelect>
                </div>
              </div>
          </PCard>

                     {/* 通知设置 */}
          <PCard>
            <div className="flex items-center mb-4">
              <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">通知设置</h3>
            </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">邮件通知</p>
                    <p className="text-sm text-gray-500">接收重要更新和交易通知</p>
                  </div>
                  <PToggle
                    checked={notifications.email}
                    onChange={() => handleNotificationChange('email')}
                    aria-label="邮件通知"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">短信通知</p>
                    <p className="text-sm text-gray-500">接收安全验证和紧急通知</p>
                  </div>
                  <PToggle
                    checked={notifications.sms}
                    onChange={() => handleNotificationChange('sms')}
                    aria-label="短信通知"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">推送通知</p>
                    <p className="text-sm text-gray-500">接收实时交易和系统通知</p>
                  </div>
                  <PToggle
                    checked={notifications.push}
                    onChange={() => handleNotificationChange('push')}
                    aria-label="推送通知"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">安全通知</p>
                    <p className="text-sm text-gray-500">接收登录和安全事件通知</p>
                  </div>
                  <PToggle
                    checked={notifications.security}
                    onChange={() => handleNotificationChange('security')}
                    aria-label="安全通知"
                  />
                </div>
              </div>
          </PCard>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <PButton type="button" variant="primary">保存设置</PButton>
        </div>
      </div>
    </Layout>
  )
} 