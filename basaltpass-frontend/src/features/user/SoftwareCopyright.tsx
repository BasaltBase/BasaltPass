import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Layout from '@features/user/components/Layout'
import { PCard } from '@ui'
import { ROUTES } from '@constants'
import { buildInfo } from '@shared/generated/buildInfo'

const SoftwareCopyright: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to={ROUTES.user.dashboard} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          返回
        </Link>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">软件版权</h1>
          <p className="mx-auto max-w-2xl text-sm text-gray-500">
            当前页面展示 BasaltPass 前端构建时写入的软件版本与版权信息。打 Git tag 后重新构建，版本会自动更新。
          </p>
        </div>

        <PCard>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">软件名称</p>
              <p className="text-lg font-semibold text-gray-900">BasaltPass</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">品牌</p>
              <p className="text-lg font-semibold text-gray-900">BasaltBase</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">当前版本</p>
              <p className="text-lg font-semibold text-gray-900">{buildInfo.version}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">构建提交</p>
              <p className="text-lg font-semibold text-gray-900">{buildInfo.commit}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">构建时间</p>
              <p className="text-lg font-semibold text-gray-900">{new Date(buildInfo.generatedAt).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">版权</p>
              <p className="text-lg font-semibold text-gray-900">
                Copyright {buildInfo.copyrightStartYear} - {currentYear}
              </p>
            </div>
          </div>
        </PCard>

        <PCard>
          <div className="space-y-3 text-sm text-gray-600">
            <p>Copyright {buildInfo.copyrightStartYear} - {currentYear} BasaltPass BasaltBase powered by <a href="https://hollowdata.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">HollowData</a></p>
            <p>版本号优先读取 `VITE_APP_VERSION`，否则自动读取当前仓库最新 Git tag；如果仓库没有 tag，则回退到前端 `package.json` 版本号。</p>
          </div>
        </PCard>
      </div>
    </Layout>
  )
}

export default SoftwareCopyright
