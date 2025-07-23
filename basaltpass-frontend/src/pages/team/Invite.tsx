import React, { useState, useRef, useEffect } from 'react'
import Layout from '../../components/Layout'
import { invitationApi } from '../../api/invitation'
import { userApi, UserSearchResult } from '../../api/user'
import { useNavigate, useParams } from 'react-router-dom'
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline'

const Invite: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const teamId = Number(id)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()
  const searchTimeoutRef = useRef<number>()

  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    setSearchLoading(true)
    try {
      const response = await userApi.search(query, 10)
      const results = response.data.filter(user => 
        !selectedUsers.some(selected => selected.id === user.id)
      )
      setSearchResults(results)
      setShowDropdown(true)
    } catch (error) {
      console.error('搜索用户失败:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // 处理搜索输入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // 设置新的定时器，延迟搜索
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(value)
    }, 300)
  }

  // 选择用户
  const selectUser = (user: UserSearchResult) => {
    setSelectedUsers(prev => [...prev, user])
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  // 移除选中的用户
  const removeUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId))
  }

  // 提交邀请
  const submit = async () => {
    if (selectedUsers.length === 0) {
      alert('请至少选择一个用户')
      return
    }
    
    setLoading(true)
    try {
      const userIds = selectedUsers.map(user => user.id)
      await invitationApi.create(teamId, userIds, remark)
      alert(`已成功邀请 ${selectedUsers.length} 位用户`)
      navigate(`/teams/${teamId}`)
    } catch (error: any) {
      alert(error.response?.data?.message || '发送邀请失败')
    } finally {
      setLoading(false)
    }
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">邀请成员</h1>
          <button
            onClick={() => navigate(`/teams/${teamId}`)}
            className="text-gray-500 hover:text-gray-700"
          >
            返回团队
          </button>
        </div>

        {/* 用户搜索 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            搜索用户
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery && setShowDropdown(true)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入用户名或邮箱搜索..."
          />
          
          {/* 搜索结果下拉列表 */}
          {showDropdown && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
              {searchLoading ? (
                <div className="px-4 py-3 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.nickname}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div className="px-4 py-3 text-center text-gray-500">
                  未找到匹配的用户
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 已选择的用户 */}
        {selectedUsers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              已选择的用户 ({selectedUsers.length})
            </label>
            <div className="space-y-2">
              {selectedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.nickname}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            邀请备注 (可选)
          </label>
          <textarea
            value={remark}
            onChange={e => setRemark(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="可以在这里添加邀请说明..."
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-4">
          <button
            disabled={loading || selectedUsers.length === 0}
            onClick={submit}
            className={`px-6 py-3 rounded-lg font-medium ${
              loading || selectedUsers.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? '发送中...' : `发送邀请 (${selectedUsers.length})`}
          </button>
          <button
            onClick={() => navigate(`/teams/${teamId}`)}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>

      {/* 点击外部关闭下拉列表 */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </Layout>
  )
}

export default Invite 