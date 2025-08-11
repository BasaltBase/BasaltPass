import React, { useState } from 'react'
import Layout from '../../components/Layout'
import { PCard, PButton, PInput, PSelect, PCheckbox } from '../../components'
import { 
  UserIcon, 
  CogIcon, 
  BellIcon,
  WalletIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function ComponentShowcase() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    notifications: true,
    newsletter: false
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新组件展示</h1>
          <p className="mt-1 text-sm text-gray-500">
            展示如何在用户页面中使用新的 PCard、PButton、PInput 等组件
          </p>
        </div>

        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <PCard variant="default" hoverable>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <WalletIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    钱包余额
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ¥1,234.56
                  </dd>
                </dl>
              </div>
            </div>
          </PCard>

          <PCard variant="bordered" hoverable>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    已完成订单
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    23
                  </dd>
                </dl>
              </div>
            </div>
          </PCard>

          <PCard variant="elevated" hoverable>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    安全等级
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    高
                  </dd>
                </dl>
              </div>
            </div>
          </PCard>

          <PCard variant="default" hoverable>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    待处理
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    5
                  </dd>
                </dl>
              </div>
            </div>
          </PCard>
        </div>

        {/* 表单示例 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PCard variant="bordered" size="lg">
            <div className="flex items-center mb-6">
              <UserIcon className="w-6 h-6 text-blue-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">个人信息</h3>
            </div>
            
            <div className="space-y-4">
              <PInput
                label="姓名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入您的姓名"
              />
              
              <PInput
                label="邮箱地址"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
              />
              
              <PSelect
                label="用户角色"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="user">普通用户</option>
                <option value="premium">高级用户</option>
                <option value="admin">管理员</option>
              </PSelect>

              <div className="space-y-3">
                <PCheckbox
                  checked={formData.notifications}
                  onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                  label="接收系统通知"
                />
                
                <PCheckbox
                  checked={formData.newsletter}
                  onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                  label="订阅邮件资讯"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <PButton size="md">
                  保存更改
                </PButton>
                <PButton variant="secondary" size="md">
                  重置
                </PButton>
              </div>
            </div>
          </PCard>

          <PCard variant="elevated" size="lg">
            <div className="flex items-center mb-6">
              <CogIcon className="w-6 h-6 text-green-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">快速操作</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <PButton variant="primary" size="md" className="w-full">
                <WalletIcon className="w-5 h-5 mr-2" />
                钱包充值
              </PButton>
              
              <PButton variant="secondary" size="md" className="w-full">
                <CreditCardIcon className="w-5 h-5 mr-2" />
                查看订单
              </PButton>
              
              <PButton variant="ghost" size="md" className="w-full">
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                安全设置
              </PButton>
              
              <PButton variant="danger" size="md" className="w-full">
                <BellIcon className="w-5 h-5 mr-2" />
                通知中心
              </PButton>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">提示</h4>
              <p className="text-sm text-blue-700">
                这些组件提供了统一的设计语言和用户体验，支持多种变体和尺寸选择。
              </p>
            </div>
          </PCard>
        </div>

        {/* 按钮变体展示 */}
        <PCard>
          <h3 className="text-lg font-medium text-gray-900 mb-6">按钮变体展示</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">主要按钮</h4>
              <div className="flex flex-wrap gap-3">
                <PButton variant="primary" size="sm">小按钮</PButton>
                <PButton variant="primary" size="md">中等按钮</PButton>
                <PButton variant="primary" size="lg">大按钮</PButton>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">次要按钮</h4>
              <div className="flex flex-wrap gap-3">
                <PButton variant="secondary" size="sm">小按钮</PButton>
                <PButton variant="secondary" size="md">中等按钮</PButton>
                <PButton variant="secondary" size="lg">大按钮</PButton>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">其他变体</h4>
              <div className="flex flex-wrap gap-3">
                <PButton variant="danger">危险操作</PButton>
                <PButton variant="ghost">幽灵按钮</PButton>
                <PButton variant="gradient">渐变按钮</PButton>
              </div>
            </div>
          </div>
        </PCard>

        {/* 卡片变体展示 */}
        <PCard>
          <h3 className="text-lg font-medium text-gray-900 mb-6">卡片变体展示</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PCard variant="default" size="sm">
              <h4 className="font-medium mb-2">默认卡片</h4>
              <p className="text-sm text-gray-600">这是默认样式的小尺寸卡片。</p>
            </PCard>
            
            <PCard variant="bordered" size="md">
              <h4 className="font-medium mb-2">边框卡片</h4>
              <p className="text-sm text-gray-600">这是带边框的中等尺寸卡片。</p>
            </PCard>
            
            <PCard variant="elevated" size="lg" hoverable>
              <h4 className="font-medium mb-2">提升卡片</h4>
              <p className="text-sm text-gray-600">这是提升样式的大尺寸可悬停卡片。</p>
            </PCard>
          </div>
        </PCard>
      </div>
    </Layout>
  )
}
