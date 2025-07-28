import Layout from '../../../components/Layout'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function LoginHistory() {
  // TODO: 后续对接API获取数据
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center">
            <Link 
              to="/security" 
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">登录历史</h1>
              <p className="mt-1 text-sm text-gray-500">查看您最近的登录活动，保障账户安全</p>
            </div>
          </div>

          {/* 登录历史表格 */}
          <div className="bg-white shadow rounded p-4">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">时间</th>
                  <th className="px-4 py-2 text-left">IP地址</th>
                  <th className="px-4 py-2 text-left">设备/浏览器</th>
                </tr>
              </thead>
              <tbody>
                {/* 后续用map渲染数据 */}
                <tr>
                  <td className="px-4 py-2">2024-05-01 12:00:00</td>
                  <td className="px-4 py-2">127.0.0.1</td>
                  <td className="px-4 py-2">Chrome on Windows</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
} 