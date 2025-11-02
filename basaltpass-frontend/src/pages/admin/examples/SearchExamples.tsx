import React, { useState } from 'react'
import AdminLayout from '@components/AdminLayout'
import { EntitySearchSelect, BaseEntityItem } from '../../../components'
import { 
  MagnifyingGlassIcon, 
  BuildingOffice2Icon, 
  CubeIcon,
  UserGroupIcon 
} from '@heroicons/react/24/outline'

/**
 * Admin 搜索示例页面
 * 展示如何使用 EntitySearchSelect 组件进行不同类型的搜索
 */
const SearchExamples: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = useState<BaseEntityItem[]>([])
  const [selectedTenants, setSelectedTenants] = useState<BaseEntityItem[]>([])
  const [selectedApps, setSelectedApps] = useState<BaseEntityItem[]>([])

  return (
    <AdminLayout title="搜索组件示例">
      <div className="space-y-8">
        {/* 页面头部 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MagnifyingGlassIcon className="h-8 w-8 mr-3 text-indigo-600" />
            搜索组件示例
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            展示如何使用通用搜索组件进行用户、租户和应用搜索
          </p>
        </div>

        {/* 用户搜索示例 */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-6 w-6 mr-2 text-indigo-600" />
            用户搜索示例 (Admin Context)
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            使用 admin 上下文搜索平台中的所有用户，获取详细的用户信息
          </p>
          
          <EntitySearchSelect
            entity="user"
            context="admin"
            value={selectedUsers}
            onChange={setSelectedUsers}
            placeholder="搜索用户名或邮箱..."
            variant="chips"
            limit={15}
          />
          
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">选中的用户信息：</h3>
              <pre className="text-xs text-blue-800 overflow-auto">
                {JSON.stringify(selectedUsers.map(u => u.raw), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* 租户搜索示例 */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BuildingOffice2Icon className="h-6 w-6 mr-2 text-purple-600" />
            租户搜索示例
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            搜索平台中的租户组织，可以按名称或代码搜索
          </p>
          
          <EntitySearchSelect
            entity="tenant"
            context="admin"
            value={selectedTenants}
            onChange={setSelectedTenants}
            placeholder="搜索租户名称或代码..."
            variant="list"
            maxSelect={5}
            limit={10}
          />
          
          {selectedTenants.length > 0 && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <h3 className="text-sm font-medium text-purple-900 mb-2">选中的租户信息：</h3>
              <pre className="text-xs text-purple-800 overflow-auto">
                {JSON.stringify(selectedTenants.map(t => t.raw), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* 应用搜索示例 */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CubeIcon className="h-6 w-6 mr-2 text-green-600" />
            应用搜索示例
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            搜索平台中的应用程序，可以按应用名称搜索
          </p>
          
          <EntitySearchSelect
            entity="app"
            context="admin"
            value={selectedApps}
            onChange={setSelectedApps}
            placeholder="搜索应用名称..."
            variant="chips"
            maxSelect={3}
            limit={8}
          />
          
          {selectedApps.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-900 mb-2">选中的应用信息：</h3>
              <pre className="text-xs text-green-800 overflow-auto">
                {JSON.stringify(selectedApps.map(a => a.raw), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">组件使用说明</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900">基本用法：</h3>
              <code className="mt-1 block p-2 bg-white rounded border text-xs">
                {`<EntitySearchSelect
  entity="user" // 'user' | 'tenant' | 'app'
  context="admin" // 'user' | 'admin' | 'tenant'
  value={selectedItems}
  onChange={setSelectedItems}
  variant="chips" // 'chips' | 'list'
  maxSelect={5} // 最大选择数量
  limit={10} // 搜索结果数量限制
/>`}
              </code>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">支持的搜索类型：</h3>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li><strong>用户搜索</strong>：支持普通用户搜索（context="user"）和管理员搜索（context="admin"）</li>
                <li><strong>租户搜索</strong>：搜索平台中的租户组织</li>
                <li><strong>应用搜索</strong>：搜索平台中的应用程序</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">显示模式：</h3>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li><strong>chips</strong>：以彩色标签形式显示选中项</li>
                <li><strong>list</strong>：以列表形式显示选中项</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default SearchExamples
