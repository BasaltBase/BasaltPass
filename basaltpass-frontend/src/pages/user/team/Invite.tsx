import React, { useState, useRef, useEffect } from 'react'
import Layout from '../../../components/Layout'
import { invitationApi } from '../../../api/invitation'
import { userApi, UserSearchResult } from '../../../api/user'
import { useNavigate, useParams } from 'react-router-dom'
import { XMarkIcon, UserIcon, MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

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
      <div className="space-y-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">邀请成员</h1>
            <p className="mt-1 text-sm text-gray-500">
              搜索并邀请用户加入您的团队
            </p>
          </div>
          <button
            onClick={() => navigate(`/teams/${teamId}`)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            返回团队
          </button>
        </div>

        {/* 用户搜索 */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-8">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-gray-700">
              <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-indigo-500" />
              搜索用户
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setShowDropdown(true)}
                className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                placeholder="输入用户名或邮箱搜索..."
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="h-5 w-5 text-gray-400">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
          
          {/* 搜索结果下拉列表 */}
          {showDropdown && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-2 max-h-60 overflow-y-auto">
              {searchLoading ? (
                <div className="px-4 py-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm">搜索中...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3 transition-colors duration-150"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.nickname}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">未找到匹配的用户</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 已选择的用户 */}
        {selectedUsers.length > 0 && (
          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <UserIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  已选择的用户
                </label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {selectedUsers.length} 人
                </span>
              </div>
              <div className="space-y-3">
                {selectedUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between bg-indigo-50 rounded-lg px-4 py-3 border border-indigo-100">
                    <div className="flex items-center space-x-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{user.nickname}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors duration-150"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 备注 */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-8">
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
                className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 resize-none"
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
            className="px-6 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            取消
          </button>
          <button
            disabled={loading || selectedUsers.length === 0}
            onClick={submit}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              loading || selectedUsers.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                发送中...
              </div>
            ) : (
              `发送邀请 (${selectedUsers.length})`
            )}
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