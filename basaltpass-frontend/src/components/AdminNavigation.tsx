import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BuildingOfficeIcon,
  CubeIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  WalletIcon,
  CreditCardIcon,
  GiftIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentTextIcon,
  BellIcon,
  KeyIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'

interface NavigationItem {
  name: string
  href?: string
  icon: React.ComponentType<any>
  children?: NavigationItem[]
  current?: boolean
}

const navigation: NavigationItem[] = [
  {
    name: '仪表板',
    href: '/admin/dashboard',
    icon: BuildingOfficeIcon,
  },
  {
    name: '通知管理',
    href: '/admin/notifications',
    icon: BellIcon,
  },
  {
    name: '用户管理',
    icon: UsersIcon,
    children: [
      { name: '用户列表', href: '/admin/users', icon: UsersIcon },
    ]
  },
    {
    name: '协作管理',
    icon: UsersIcon,
    children: [
      { name: '团队管理', href: '/admin/teams', icon: UsersIcon },
      { name: '邀请管理', href: '/admin/invitations', icon: UserGroupIcon },
    ]
  },
  {
    name: '平台管理',
    icon: Cog6ToothIcon,
    children: [
      { name: '租户管理', href: '/admin/tenants', icon: BuildingOfficeIcon },
      { name: 'OAuth客户端', href: '/admin/oauth-clients', icon: KeyIcon },
    ]
  },
  {
    name: '系统角色与权限',
    icon: KeyIcon,
    children: [
      { name: '角色管理', href: '/admin/roles', icon: KeyIcon },
      { name: '权限管理', href: '/admin/permissions', icon: KeyIcon },
    ]
  },
  {
    name: '订阅与支付',
    icon: CreditCardIcon,
    children: [
      { name: '订阅管理', href: '/admin/subscriptions', icon: CreditCardIcon },
      { name: '产品管理', href: '/admin/products', icon: ShoppingCartIcon },
      { name: '套餐管理', href: '/admin/plans', icon: GiftIcon },
      { name: '定价管理', href: '/admin/prices', icon: CurrencyDollarIcon },
      { name: '优惠券管理', href: '/admin/coupons', icon: TagIcon },
    ]
  },
  {
    name: '钱包管理',
    icon: WalletIcon,
    children: [
      { name: '钱包总览', href: '/admin/wallets', icon: WalletIcon },
    ]
  },
  {
    name: '系统管理',
    icon: Cog6ToothIcon,
    children: [
  { name: '系统设置', href: '/admin/settings', icon: Cog6ToothIcon },
      { name: '审计日志', href: '/admin/logs', icon: DocumentTextIcon },
    ]
  },
]

export default function AdminNavigation() {
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<string[]>(['用户管理', '平台管理', '订阅与支付'])

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    )
  }

  const isCurrentPath = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const isExpanded = expandedSections.includes(item.name)
    const isCurrent = item.href ? isCurrentPath(item.href) : false
    const hasCurrentChild = item.children?.some(child => child.href && isCurrentPath(child.href))

    if (item.children) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSection(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
              hasCurrentChild || isCurrent
                ? 'bg-indigo-100 text-indigo-900'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
          >
            <div className="flex items-center">
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </div>
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children.map(child => renderNavigationItem(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        to={item.href!}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isCurrent
            ? 'bg-indigo-100 text-indigo-900'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
        style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
      >
        <item.icon className="h-5 w-5 mr-3" />
        {item.name}
      </Link>
    )
  }

  return (
    <nav className="space-y-1">
      {navigation.map(item => renderNavigationItem(item))}
    </nav>
  )
}
