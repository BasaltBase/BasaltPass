import React from 'react'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PCard, PButton } from '@ui'
import { ROUTES } from '@constants'
import { 
  ArrowLeftIcon, 
  CodeBracketIcon, 
  CpuChipIcon, 
  ShieldCheckIcon, 
  UserGroupIcon, 
  CreditCardIcon,
  BellIcon,
  CogIcon,
  ChartBarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

const About: React.FC = () => {
  const features = [
    {
      icon: UserGroupIcon,
      title: '团队协作',
      description: '支持多用户团队管理，角色权限控制，成员邀请与管理'
    },
    {
      icon: CreditCardIcon,
      title: '多币种钱包',
      description: '支持多种货币的钱包系统，充值提现，交易记录管理'
    },
    {
      icon: ShieldCheckIcon,
      title: '安全认证',
      description: 'JWT认证、OAuth2登录、二次验证、密码重置等安全功能'
    },
    {
      icon: BellIcon,
      title: '通知系统',
      description: '实时通知推送，邀请管理，系统消息广播'
    },
    {
      icon: CogIcon,
      title: '管理后台',
      description: '完整的后台管理系统，用户管理、审计日志、系统配置'
    },
    {
      icon: ChartBarIcon,
      title: '订阅系统',
      description: '灵活的订阅计划管理，支付集成，订单处理'
    }
  ]

  const techStack = {
    frontend: [
      { name: 'React 18', description: '现代化前端框架' },
      { name: 'TypeScript', description: '类型安全的JavaScript' },
      { name: 'Tailwind CSS', description: '实用优先的CSS框架' },
      { name: 'Vite', description: '快速构建工具' },
      { name: 'React Router', description: '客户端路由' },
      { name: 'Axios', description: 'HTTP客户端' }
    ],
    backend: [
      { name: 'Go Fiber', description: '高性能Web框架' },
      { name: 'GORM', description: 'Go语言ORM库' },
      { name: 'SQLite', description: '轻量级数据库' },
      { name: 'JWT', description: 'JSON Web Token认证' },
      { name: 'OAuth2', description: '第三方登录支持' },
      { name: 'bcrypt', description: '密码加密' }
    ]
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 返回按钮 */}
        <div className="flex items-center">
          <Link to={ROUTES.user.dashboard}>
            <PButton variant="secondary">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              返回仪表板
            </PButton>
          </Link>
        </div>

        {/* 头部区域 */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-12 border border-blue-100">
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CpuChipIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">BasaltPass</h1>
            <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
              玄武岩通行证 - 面向B端和C端的SaaS化、平台化用户账户与钱包中心
            </p>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              作为所有业务项目的单点认证和账户系统（SSO/Identity Hub），
              提供完整的用户管理、团队协作、钱包系统、订阅管理等核心功能。
            </p>
          </div>
        </div>

        {/* 核心功能 */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">核心功能</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              提供完整的用户账户管理解决方案，支持多种业务场景
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <PCard
                key={index}
                variant="bordered"
                hoverable
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </PCard>
            ))}
          </div>
        </div>

        {/* 技术栈 */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">技术栈</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              采用现代化的技术栈，确保高性能、高可用性和良好的开发体验
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 前端技术栈 */}
            <PCard variant="bordered" size="lg">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <CodeBracketIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">前端技术</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {techStack.frontend.map((tech, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-gray-900">{tech.name}</div>
                      <div className="text-sm text-gray-500">{tech.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </PCard>

            {/* 后端技术栈 */}
            <PCard variant="bordered" size="lg">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <CpuChipIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">后端技术</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {techStack.backend.map((tech, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-gray-900">{tech.name}</div>
                      <div className="text-sm text-gray-500">{tech.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </PCard>
          </div>
        </div>

        {/* 项目特性 */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">项目特性</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              专注于提供企业级的用户账户管理解决方案
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <GlobeAltIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">平台化</h3>
              <p className="text-gray-600 text-sm">支持多业务程序，共享用户资源</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">安全性</h3>
              <p className="text-gray-600 text-sm">多重安全认证，保护用户数据</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CogIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">可扩展</h3>
              <p className="text-gray-600 text-sm">模块化设计，易于扩展和维护</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <UserGroupIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">协作性</h3>
              <p className="text-gray-600 text-sm">团队协作，角色权限管理</p>
            </div>
          </div>
        </div>

        {/* 版本信息 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">版本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">v1.0.0</div>
                <div className="text-gray-600">当前版本</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">2025</div>
                <div className="text-gray-600">发布年份</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">MIT</div>
                <div className="text-gray-600">开源协议</div>
              </div>
            </div>
          </div>
        </div>

        {/* 联系信息 */}
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            如有问题或建议，请联系开发团队
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="https://github.com/BasaltBase/BasaltPass"
              className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              项目文档
            </a>
            <span className="text-gray-400">|</span>
            <a
              href="https://github.com/BasaltBase/BasaltPass"
              className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              GitHub
            </a>
            <span className="text-gray-400">|</span>
            <a
              href="HollowData.com"
              className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              联系我们
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default About 