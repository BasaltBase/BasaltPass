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
  ShoppingCartIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { ROUTES } from '@constants'
import { useConfig } from '@contexts/ConfigContext'

interface NavigationItem {
  name: string
  href?: string
  icon: React.ComponentType<any>
  children?: NavigationItem[]
  current?: boolean
  requiresMarket?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    name: '仪表板',
    href: ROUTES.admin.dashboard,
    icon: BuildingOfficeIcon,
  },
  {
    name: '通知管理',
    href: ROUTES.admin.notifications,
    icon: BellIcon,
  },
  {
    name: '用户管理',
    icon: UsersIcon,
    children: [
      { name: '用户列表', href: ROUTES.admin.users, icon: UsersIcon },
    ]
  },
    {
    name: '协作管理',
    icon: UsersIcon,
    children: [
      { name: '团队管理', href: ROUTES.admin.teams, icon: UsersIcon },
      { name: '邀请管理', href: ROUTES.admin.invitations, icon: UserGroupIcon },
    ]
  },
  {
    name: '平台管理',
    icon: Cog6ToothIcon,
    children: [
      { name: '租户管理', href: ROUTES.admin.tenants, icon: BuildingOfficeIcon },
      { name: 'OAuth客户端', href: ROUTES.admin.oauthClients, icon: KeyIcon },
    ]
  },
  {
    name: '系统角色与权限',
    icon: KeyIcon,
    children: [
      { name: '角色管理', href: ROUTES.admin.roles, icon: KeyIcon },
      { name: '权限管理', href: ROUTES.admin.permissions, icon: KeyIcon },
    ]
  },
  {
    name: '订阅与支付',
    icon: CreditCardIcon,
    requiresMarket: true,
    children: [
      { name: '订阅管理', href: ROUTES.admin.subscriptions, icon: CreditCardIcon },
      { name: '产品管理', href: ROUTES.admin.products, icon: ShoppingCartIcon },
      { name: '套餐管理', href: ROUTES.admin.plans, icon: GiftIcon },
      { name: '定价管理', href: ROUTES.admin.prices, icon: CurrencyDollarIcon },
      { name: '优惠券管理', href: ROUTES.admin.coupons, icon: TagIcon },
    ]
  },
  {
    name: '钱包管理',
    icon: WalletIcon,
    requiresMarket: true,
    children: [
      { name: '钱包总览', href: ROUTES.admin.wallets, icon: WalletIcon },
    ]
  },
  {
    name: '系统管理',
    icon: Cog6ToothIcon,
    children: [
      { name: '通用设置', href: ROUTES.admin.settings.general, icon: Cog6ToothIcon },
      { name: '认证设置', href: ROUTES.admin.settings.auth, icon: KeyIcon },
      { name: '安全设置', href: ROUTES.admin.settings.security, icon: KeyIcon },
      { name: 'CORS设置', href: ROUTES.admin.settings.cors, icon: Cog6ToothIcon },
      { name: 'OAuth设置', href: ROUTES.admin.settings.oauth, icon: KeyIcon },
      { name: '邮件设置', href: ROUTES.admin.settings.email, icon: EnvelopeIcon },
      { name: 'SMTP设置', href: ROUTES.admin.settings.smtp, icon: EnvelopeIcon },
      { name: '邮件中心', href: ROUTES.admin.settings.emailTest, icon: EnvelopeIcon },
      { name: '日志设置', href: ROUTES.admin.settings.logging, icon: DocumentTextIcon },
      { name: '审计日志', href: ROUTES.admin.logs, icon: DocumentTextIcon },
      { name: '会话设置', href: ROUTES.admin.settings.session, icon: Cog6ToothIcon },
      { name: '外观品牌', href: ROUTES.admin.settings.ui, icon: Cog6ToothIcon },
      { name: '上传设置', href: ROUTES.admin.settings.uploads, icon: Cog6ToothIcon },
      { name: '通知设置', href: ROUTES.admin.settings.notifications, icon: BellIcon },
      { name: 'JWT设置', href: ROUTES.admin.settings.jwt, icon: KeyIcon },
      { name: '缓存设置', href: ROUTES.admin.settings.cache, icon: Cog6ToothIcon },
      { name: '存储设置', href: ROUTES.admin.settings.storage, icon: Cog6ToothIcon },
      { name: '计费订阅', href: ROUTES.admin.settings.billing, icon: CreditCardIcon },
      { name: '特性开关', href: ROUTES.admin.settings.features, icon: Cog6ToothIcon },
      { name: '维护模式', href: ROUTES.admin.settings.maintenance, icon: Cog6ToothIcon },
      { name: '统计分析', href: ROUTES.admin.settings.analytics, icon: Cog6ToothIcon },
      { name: '验证码', href: ROUTES.admin.settings.captcha, icon: Cog6ToothIcon },
      { name: 'Webhooks', href: ROUTES.admin.settings.webhooks, icon: Cog6ToothIcon },
      { name: '审计设置', href: ROUTES.admin.settings.audit, icon: DocumentTextIcon },
      { name: '分页设置', href: ROUTES.admin.settings.pagination, icon: Cog6ToothIcon },
    ]
  },
]

export default function AdminNavigation() {
  const location = useLocation()
  const { marketEnabled } = useConfig()
  const [expandedSections, setExpandedSections] = useState<string[]>(['系统管理'])

  // 根据市场功能配置过滤导航项
  const navigation = navigationItems.filter(item => {
    if (item.requiresMarket && !marketEnabled) {
      return false
    }
    return true
  })

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
