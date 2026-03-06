import { Link } from 'react-router-dom'
import { ROUTES } from '@constants'

function Terms() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">服务条款</h1>
        <p className="mt-4 text-sm text-gray-700 leading-6">
          使用 BasaltPass 即表示您同意遵守平台规则、账号安全责任和适用法律。请勿进行未授权访问、攻击、滥用或传播违法内容。
        </p>
        <p className="mt-3 text-sm text-gray-700 leading-6">
          我们可能按产品更新调整条款。发生重大变化时将通过站内通知或邮件告知。若您继续使用服务，视为接受更新后的条款。
        </p>
        <div className="mt-6">
          <Link to={ROUTES.user.register} className="text-blue-600 hover:underline">
            返回注册
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Terms
