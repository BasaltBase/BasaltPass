import React, { useState } from 'react'
import { uiAlert } from '@contexts/DialogContext'
import Layout from '@features/user/components/Layout'
import { invitationApi } from '@api/user/invitation'
import { EntitySearchSelect, type BaseEntityItem, PButton, PTextarea } from '@ui'
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
      uiAlert('请至少选择一个用户')
      return
    }
    
    setLoading(true)
    try {
      const userIds = selectedUsers.map(u => Number(u.id))
      await invitationApi.create(teamId, userIds, remark)
      uiAlert(`已成功邀请 ${selectedUsers.length} 位用户`)
      navigate(`/teams/${teamId}`)
    } catch (error: any) {
      uiAlert(error.response?.data?.message || '发送邀请失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">邀请成员</h1>
            <p className="text-sm text-gray-500">
              搜索用户并将他们加入当前团队。
            </p>
          </div>
          <PButton
            onClick={() => navigate(`/teams/${teamId}`)}
            variant="secondary"
            size="sm"
          >
            返回团队
          </PButton>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-sm font-semibold text-gray-900">选择用户</h2>
            <p className="text-sm text-gray-500">可按昵称或邮箱模糊搜索。</p>
          </div>
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

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-gray-700">
              <DocumentTextIcon className="mr-2 h-5 w-5 text-gray-400" />
              邀请备注（可选）
            </label>
            <PTextarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={3}
              placeholder="填写一段简短说明，收件人会更容易理解这次邀请。"
              variant="rounded"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <PButton
            onClick={() => navigate(`/teams/${teamId}`)}
            variant="secondary"
          >
            取消
          </PButton>
          <PButton
            disabled={loading || selectedUsers.length === 0}
            loading={loading}
            onClick={submit}
            variant="primary"
          >
            {`发送邀请 (${selectedUsers.length})`}
          </PButton>
        </div>
      </div>

    </Layout>
  )
}

export default Invite 
