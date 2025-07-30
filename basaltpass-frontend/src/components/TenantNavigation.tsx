import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  ChartBarIcon,
  CubeIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  GiftIcon,
  DocumentTextIcon,
  BellIcon,
  KeyIcon,
  ShoppingCartIcon,
  InformationCircleIcon
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
    href: '/tenant/dashboard',
    icon: ChartBarIcon,
  },
  {
    name: '租户信息',
    href: '/tenant/info',
    icon: InformationCircleIcon,
  },
  {
    name: '应用管理',
    icon: CubeIcon,
    children: [
      { name: '我的应用', href: '/tenant/apps', icon: CubeIcon },
      { name: 'OAuth客户端', href: '/tenant/oauth/clients', icon: KeyIcon },
    ]
  },
  {
    name: '用户管理',
    icon: UsersIcon,
    children: [
      { name: '用户列表', href: '/tenant/users', icon: UsersIcon },
      { name: '角色权限', href: '/tenant/roles', icon: KeyIcon },
    ]
  },
  {
    name: '通知管理',
    icon: BellIcon,
    children: [
      { name: '发送通知', href: '/tenant/notifications', icon: BellIcon },
      { name: '消息中心', href: '/tenant/messages', icon: DocumentTextIcon },
    ]
  },
  {
    name: '商品订阅',
    icon: CreditCardIcon,
    children: [
      { name: '我的订阅', href: '/tenant/subscriptions', icon: CreditCardIcon },
      { name: '商品目录', href: '/tenant/products', icon: ShoppingCartIcon },
      { name: '套餐升级', href: '/tenant/plans', icon: GiftIcon },
      { name: '账单历史', href: '/tenant/billing', icon: DocumentTextIcon },
    ]
  },
]

export default function TenantNavigation() {
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<string[]>(['应用管理', '商品订阅'])

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
                ? 'bg-blue-100 text-blue-900'
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
            ? 'bg-blue-100 text-blue-900'
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
