import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
      <p className="text-xl text-gray-700 mb-6">页面未找到</p>
      <Link to="/" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-blue-700 transition">
        返回首页
      </Link>
    </div>
  )
} 