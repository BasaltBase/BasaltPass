import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { MagnifyingGlassIcon, UserIcon, BuildingOffice2Icon, CubeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { userApi, UserSearchResult } from '@api/user/user'
import { adminUserApi, AdminUser } from '@api/admin/user'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'
import { appApi } from '@api/admin/app'

// 统一的实体类型
export type EntityType = 'user' | 'tenant' | 'app'
export type ContextType = 'user' | 'admin' | 'tenant'

export interface BaseEntityItem {
  id: number | string
  label: string
  subtitle?: string
  avatar?: string
  raw: any
  type: EntityType
}

interface EntitySearchSelectProps {
  entity: EntityType
  context?: ContextType // 对 user 搜索有影响: user vs admin
  value: BaseEntityItem[]
  onChange: (items: BaseEntityItem[]) => void
  placeholder?: string
  maxSelect?: number
  debounceMs?: number
  limit?: number
  className?: string
  variant?: 'list' | 'chips'
}

/**
 * 通用搜索+多选组件
 * - 输入关键字模糊搜索
 * - 下拉提示点击添加
 * - 支持 user / tenant / app 三类实体
 * - 根据 context 区分 user 普通与 admin 查询接口
 */
const EntitySearchSelect: React.FC<EntitySearchSelectProps> = ({
  entity,
  context = 'user',
  value,
  onChange,
  placeholder = '输入关键字搜索...',
  maxSelect,
  debounceMs = 300,
  limit = 10,
  className = '',
  variant = 'list'
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BaseEntityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const updateDropdownPosition = () => {
    if (inputRef) {
      const rect = inputRef.getBoundingClientRect()
      const newPosition = {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      }
      console.log('更新下拉框位置:', newPosition)
      setDropdownPosition(newPosition)
    }
  }

  useEffect(() => {
    if (open && inputRef) {
      updateDropdownPosition()
      const handleScroll = () => updateDropdownPosition()
      const handleResize = () => updateDropdownPosition()
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [open, inputRef])

  // 实时更新下拉框位置
  useEffect(() => {
    if (open && inputRef) {
      const updatePosition = () => {
        requestAnimationFrame(updateDropdownPosition)
      }
      
      const observer = new IntersectionObserver(() => {
        updatePosition()
      })
      
      if (inputRef) {
        observer.observe(inputRef)
      }
      
      const interval = setInterval(updatePosition, 100)
      
      return () => {
        observer.disconnect()
        clearInterval(interval)
      }
    }
  }, [open, inputRef])

  // 执行搜索
  const doSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      let items: BaseEntityItem[] = []
      switch (entity) {
        case 'user': {
          if (context === 'admin') {
            console.log('开始 admin 用户搜索，查询:', q)
            const res = await adminUserApi.getUsers({ search: q, limit, page: 1 })
            console.log('Admin 用户搜索响应:', res)
            items = res.users.map((u: AdminUser): BaseEntityItem => ({
              id: u.id,
              label: u.nickname || u.email,
              subtitle: u.email,
              avatar: u.avatar_url,
              raw: u,
              type: 'user'
            }))
            console.log('转换后的 items:', items)
          } else { // 普通 user 场景
            const res = await userApi.search(q, limit)
            items = res.data.map((u: UserSearchResult): BaseEntityItem => ({
              id: u.id,
              label: u.nickname || u.email,
              subtitle: u.email,
              avatar: u.avatar,
              raw: u,
              type: 'user'
            }))
          }
          break
        }
        case 'tenant': {
          const res = await adminTenantApi.getTenantList({ search: q, limit, page: 1 })
          items = res.tenants.map((t: AdminTenantResponse): BaseEntityItem => ({
            id: t.id,
            label: t.name,
            subtitle: t.code,
            avatar: undefined,
            raw: t,
            type: 'tenant'
          }))
          break
        }
        case 'app': {
          // 现有 appApi.listApps 没有 search 参数, 先拿第一页再前端过滤
            const res = await appApi.listApps(1, limit)
            const list = Array.isArray(res?.apps) ? res.apps : (res?.data?.apps || [])
            items = list
              .filter((a: any) => !q || (a.name && a.name.toLowerCase().includes(q.toLowerCase())))
              .slice(0, limit)
              .map((a: any): BaseEntityItem => ({
                id: a.id,
                label: a.name,
                subtitle: a.description,
                avatar: a.logo_url,
                raw: a,
                type: 'app'
              }))
          break
        }
      }
      console.log('搜索结果 items:', items)
      // 过滤已选择
      const filtered = items.filter(it => !value.some(v => v.id === it.id && v.type === it.type))
      console.log('过滤后的结果:', filtered)
      setResults(filtered)
      console.log('设置 open 为 true')
      setOpen(true)
    } catch (e) {
      console.error('搜索失败', e)
      setResults([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    console.log('输入值变化:', val)
    setQuery(val)
    
    // 实时更新下拉框位置
    if (inputRef) {
      updateDropdownPosition()
    }
    
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      console.log('防抖触发搜索:', val)
      doSearch(val)
    }, debounceMs)
  }

  const addItem = (item: BaseEntityItem) => {
    if (maxSelect && value.length >= maxSelect) return
    onChange([...value, item])
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const removeItem = (id: BaseEntityItem['id']) => {
    onChange(value.filter(v => v.id !== id))
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const getIcon = () => {
    switch (entity) {
      case 'tenant': return <BuildingOffice2Icon className="h-5 w-5" />
      case 'app': return <CubeIcon className="h-5 w-5" />
      default: return <UserIcon className="h-5 w-5" />
    }
  }

  const renderHighlight = (text?: string) => {
    if (!text) return null
    if (!query) return <>{text}</>
    const lower = text.toLowerCase()
    const q = query.toLowerCase()
    const idx = lower.indexOf(q)
    if (idx === -1) return <>{text}</>
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-indigo-600 font-semibold bg-indigo-50 rounded px-0.5">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  // Portal下拉框组件
  const Dropdown = () => {
    console.log('Dropdown 渲染:', { open, results: results.length, loading })
    if (!open || typeof document === 'undefined') return null

    return ReactDOM.createPortal(
      <div
        style={{
          position: 'fixed',
          top: '100px', // 临时固定位置测试
          left: '50px',
          width: '400px',
          zIndex: 999999,
          maxHeight: '288px',
          overflowY: 'auto'
        }}
        className="bg-white border-2 border-red-500 rounded-xl shadow-2xl backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 bg-yellow-100 text-xs">
          调试信息: open={open.toString()}, results={results.length}, position=top:{dropdownPosition.top},left:{dropdownPosition.left}
        </div>
        {loading ? (
          <div className="px-4 py-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-2 text-sm">搜索中...</p>
          </div>
        ) : results.length > 0 ? (
          results.map(item => (
            <button
              key={item.id}
              onClick={() => addItem(item)}
              className="w-full px-4 py-3 text-left hover:bg-indigo-50/70 focus:bg-indigo-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3 transition-colors duration-150 group"
            >
              {item.avatar ? (
                <img src={item.avatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow group-hover:scale-105 transition-transform">
                  {getIcon()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{renderHighlight(item.label)}</div>
                {item.subtitle && <div className="text-xs text-gray-500 truncate">{renderHighlight(item.subtitle)}</div>}
              </div>
            </button>
          ))
        ) : query.trim() ? (
          <div className="px-4 py-6 text-center text-gray-500">
            {getIcon()}
            <p className="text-sm mt-2">未找到匹配结果</p>
          </div>
        ) : null}
      </div>,
      document.body
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-gray-700">
          <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-indigo-500" />
          {entity === 'user' ? '搜索用户' : entity === 'tenant' ? '搜索租户' : '搜索应用'}
        </label>
        <div className="relative">
          <input
            ref={setInputRef}
            type="text"
            value={query}
            onChange={onInputChange}
            onFocus={() => {
              if (query) {
                updateDropdownPosition()
                setOpen(true)
              }
            }}
            placeholder={placeholder}
            className="peer block w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 outline-none"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 peer-focus:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>
      
      {/* Portal 渲染下拉框 */}
      <Dropdown />

      {/* 已选择 */}
      {value.length > 0 && variant === 'list' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm font-semibold text-gray-700">
              {getIcon()}<span className="ml-2">已选择的{entity === 'user' ? '用户' : entity === 'tenant' ? '租户' : '应用'}</span>
            </label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">{value.length}</span>
          </div>
          <div className="space-y-3">
            {value.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-indigo-50 rounded-lg px-4 py-3 border border-indigo-100">
                <div className="flex items-center space-x-3 min-w-0">
                  {item.avatar ? (
                    <img src={item.avatar} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                      {getIcon()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{item.label}</div>
                    {item.subtitle && <div className="text-sm text-gray-500 truncate">{item.subtitle}</div>}
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors duration-150"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {value.length > 0 && variant === 'chips' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-xs font-semibold tracking-wide text-gray-600 uppercase">
              {getIcon()}<span className="ml-1">已选择 {value.length}</span>
            </label>
            {maxSelect && (
              <span className="text-xs text-gray-400">{value.length}/{maxSelect}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {value.map(item => (
              <div
                key={item.id}
                className="group flex items-center max-w-full pl-2 pr-1 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 hover:border-indigo-300 shadow-sm hover:shadow transition-all text-sm"
              >
                {item.avatar ? (
                  <img src={item.avatar} alt="" className="w-6 h-6 rounded-full ring-2 ring-white" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-medium ring-2 ring-white">
                    {item.label.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="mx-2 truncate max-w-[120px] text-gray-700 group-hover:text-indigo-700">{item.label}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-0.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="移除"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 点击外部关闭下拉列表 */}
      {open && (
        <div
          className="fixed inset-0 !m-0 z-9990"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}

export default EntitySearchSelect
