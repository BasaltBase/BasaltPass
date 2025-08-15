import React, { useState } from 'react'
import Layout from '../../../components/Layout'
import { invitationApi } from '@api/user/invitation'
import { EntitySearchSelect, type BaseEntityItem } from '../../../components'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

const Invite: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const teamId = Number(id)
  const [selectedUsers, setSelectedUsers] = useState<BaseEntityItem[]>([])
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  // 移除功能已在通用组件内部处理，这里无需额外实现

  // 提交邀请
  const submit = async () => {
    if (selectedUsers.length === 0) {
      alert('请至少选择一个用户')
      return
    }
    
    setLoading(true)
    try {
      const userIds = selectedUsers.map(u => Number(u.id))
      await invitationApi.create(teamId, userIds, remark)
      alert(`已成功邀请 ${selectedUsers.length} 位用户`)
      navigate(`/teams/${teamId}`)
    } catch (error: any) {
      alert(error.response?.data?.message || '发送邀请失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-10 max-w-3xl relative">
        <div className="absolute -inset-x-8 -top-8 h-48 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl blur-sm opacity-70 pointer-events-none" />
        <div className="relative flex items-center justify-between bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">邀请成员</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">团队协作</span>
              搜索并邀请用户加入您的团队
            </p>
          </div>
          <button
            onClick={() => navigate(`/teams/${teamId}`)}
            className="group px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-300 shadow-sm"
          >
            <span className="group-hover:tracking-wide transition-all">返回团队</span>
          </button>
        </div>

        {/* 用户搜索 - 使用通用组件 */}
    <div className="bg-white/90 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm p-8 ring-1 ring-transparent hover:ring-indigo-200 transition-shadow">
          <EntitySearchSelect
            entity="user"
            context="user"
            value={selectedUsers}
            onChange={setSelectedUsers}
            placeholder="输入用户名或邮箱搜索..."
            limit={10}
      variant="chips"
          />
        </div>

        {/* 已选择的用户 */}
  {/* 已选择列表由通用组件内部展示，这里无需重复 */}

        {/* 备注 */}
  <div className="bg-white/90 backdrop-blur rounded-2xl border border-purple-100 shadow-sm p-8 ring-1 ring-transparent hover:ring-purple-200 transition-shadow">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-gray-700">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
              邀请备注 (可选)
            </label>
            <div className="relative">
              <textarea
                value={remark}
                onChange={e => setRemark(e.target.value)}
                rows={3}
    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 resize-none"
                placeholder="可以在这里添加邀请说明..."
              />
              <div className="absolute top-3 right-3">
                <div className="h-5 w-5 text-gray-400">
                  <DocumentTextIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100">
          <button
            onClick={() => navigate(`/teams/${teamId}`)}
            className="group relative px-6 py-3 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-600 bg-white hover:text-indigo-600 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all overflow-hidden"
          >
            <span className="relative z-10">取消</span>
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            disabled={loading || selectedUsers.length === 0}
            onClick={submit}
            className={`group relative px-7 py-3 rounded-xl font-medium transition-all duration-300 overflow-hidden ${
              loading || selectedUsers.length === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-indigo-500/30'
            }`}
          >
            <span className="relative z-10 flex items-center">
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2" />
              )}
              {loading ? '发送中...' : `发送邀请 (${selectedUsers.length})`}
            </span>
            {!loading && selectedUsers.length > 0 && (
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.25),transparent)]" />
            )}
          </button>
        </div>
      </div>

    </Layout>
  )
}

export default Invite 