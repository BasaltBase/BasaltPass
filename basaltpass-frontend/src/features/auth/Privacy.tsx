import { Link } from 'react-router-dom'
import { ROUTES } from '@constants'

function Privacy() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">隐私政策</h1>
        <p className="mt-4 text-sm text-gray-700 leading-6">
          BasaltPass 仅在提供身份认证、账号安全和服务运营所必需的范围内收集与处理数据。我们不会出售您的个人信息。
        </p>
        <p className="mt-3 text-sm text-gray-700 leading-6">
          您可以在设置页查看和更新个人资料。涉及敏感变更（如邮箱、密码）会要求额外身份验证以保护账号安全。
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

export default Privacy
