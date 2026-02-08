import React from 'react'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PCard } from '@ui'
import { ROUTES } from '@constants'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const About: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 返回按钮 */}
        <Link to={ROUTES.user.dashboard} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          返回
        </Link>

        {/* 头部 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">BasaltPass</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            玄武岩通行证 - 面向B端和C端的SaaS化、平台化用户账户与钱包中心
          </p>
        </div>

        {/* 核心功能 */}
        <PCard>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">核心功能</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• 团队协作 - 多用户团队管理，角色权限控制</li>
            <li>• 多币种钱包 - 钱包系统，充值提现，交易记录</li>
            <li>• 安全认证 - JWT认证、OAuth2登录、二次验证</li>
            <li>• 通知系统 - 实时通知推送，系统消息广播</li>
            <li>• 管理后台 - 用户管理、审计日志、系统配置</li>
            <li>• 订阅系统 - 订阅计划管理，支付集成</li>
          </ul>
        </PCard>

        {/* 技术栈 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PCard>
            <h3 className="font-semibold text-gray-900 mb-3">前端技术</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>React 18 + TypeScript</li>
              <li>Tailwind CSS</li>
              <li>Vite + React Router</li>
              <li>Axios</li>
            </ul>
          </PCard>

          <PCard>
            <h3 className="font-semibold text-gray-900 mb-3">后端技术</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>Go Fiber + GORM</li>
              <li>SQLite</li>
              <li>JWT + OAuth2</li>
              <li>bcrypt</li>
            </ul>
          </PCard>
        </div>

        {/* 版本信息 */}
        <PCard>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">版本信息</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">v1.0.0</div>
              <div className="text-sm text-gray-500">当前版本</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">2025</div>
              <div className="text-sm text-gray-500">发布年份</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">MIT</div>
              <div className="text-sm text-gray-500">开源协议</div>
            </div>
          </div>
        </PCard>

        {/* 联系信息 */}
        <div className="text-center text-sm text-gray-600 pb-8">
          <a href="https://github.com/BasaltBase/BasaltPass" className="text-blue-600 hover:underline">
            GitHub
          </a>
          {' · '}
          <a href="HollowData.com" className="text-blue-600 hover:underline">
            联系我们
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default About 