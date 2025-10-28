import React, { useState } from 'react'
import TenantUserDetailDrawer from './TenantUserDetailDrawer'
import { AdminTenantUserDetail } from '@api/admin/tenant'

const sampleUser: AdminTenantUserDetail = {
  id: 1,
  email: 'jane.doe@example.com',
  nickname: 'Jane',
  role: 'admin',
  user_type: 'tenant_admin',
  status: 'active',
  created_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
  app_name: 'Marketing App',
  permissions: ['用户管理', '应用配置'],
  apps: [
    { id: 11, name: 'Marketing App', role: '管理员', added_at: new Date().toISOString() },
    { id: 12, name: 'Sales CRM', role: '成员', added_at: new Date().toISOString() }
  ],
  extra_info: {
    部门: '市场部',
    地区: '上海'
  }
}

const TenantUserDetailDrawerStory: React.FC = () => {
  const [open, setOpen] = useState(true)

  return (
    <div className="h-screen bg-gray-50">
      <button
        onClick={() => setOpen(true)}
        className="m-6 px-4 py-2 bg-indigo-600 text-white rounded-md"
      >
        打开用户详情
      </button>
      <TenantUserDetailDrawer
        open={open}
        loading={false}
        user={sampleUser}
        error={null}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}

export default {
  title: 'Admin/TenantUserDetailDrawer',
  component: TenantUserDetailDrawerStory
}

export const Default = () => <TenantUserDetailDrawerStory />
