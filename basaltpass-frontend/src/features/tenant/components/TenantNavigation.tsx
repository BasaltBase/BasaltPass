import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  ChartBarIcon,
  CubeIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  GiftIcon,
  DocumentTextIcon,
  BellIcon,
  KeyIcon,
  ShoppingCartIcon,
  InformationCircleIcon,
  RocketLaunchIcon,
  CurrencyDollarIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import { ROUTES } from '@constants'
import { useConfig } from '@contexts/ConfigContext'
import { useI18n } from '@shared/i18n'

interface NavigationItem {
  key: string
  href?: string
  icon: React.ComponentType<any>
  children?: NavigationItem[]
  current?: boolean
  requiresMarket?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    key: 'tenantNav.dashboard',
    href: ROUTES.tenant.dashboard,
    icon: ChartBarIcon,
  },
  {
    key: 'tenantNav.info',
    href: ROUTES.tenant.info,
    icon: InformationCircleIcon,
  },
  {
    key: 'tenantNav.appManagement',
    icon: CubeIcon,
    children: [
      { key: 'tenantNav.myApps', href: ROUTES.tenant.apps, icon: CubeIcon },
      { key: 'tenantNav.oauthClients', href: ROUTES.tenant.oauthClients, icon: KeyIcon },
      { key: 'tenantNav.crossAppTrusts', href: ROUTES.tenant.crossAppTrusts, icon: ArrowsRightLeftIcon },
      { key: 'tenantNav.automationTokens', href: ROUTES.tenant.automationTokens, icon: KeyIcon },
    ]
  },
  {
    key: 'tenantNav.userManagement',
    icon: UsersIcon,
    children: [
      { key: 'tenantNav.userList', href: ROUTES.tenant.users, icon: UsersIcon },
      { key: 'tenantNav.globalUserAuthorization', href: ROUTES.tenant.globalUserAuthorization, icon: UserPlusIcon },
      { key: 'tenantNav.teamManagement', href: ROUTES.tenant.teams, icon: UsersIcon },
      { key: 'tenantNav.walletManagement', href: ROUTES.tenant.wallets, icon: CurrencyDollarIcon },
      { key: 'tenantNav.giftCardManagement', href: ROUTES.tenant.giftCards, icon: GiftIcon },
      { key: 'tenantNav.roleManagement', href: ROUTES.tenant.roles, icon: KeyIcon },
      { key: 'tenantNav.permissionManagement', href: ROUTES.tenant.permissions, icon: KeyIcon },
    ]
  },
  {
    key: 'tenantNav.notificationManagement',
    href: ROUTES.tenant.notifications,
    icon: BellIcon,
  },
  {
    key: 'tenantNav.subscriptionManagement',
    icon: CreditCardIcon,
    requiresMarket: true,
    children: [
      { key: 'tenantNav.subscriptionOverview', href: ROUTES.tenant.subscriptions, icon: ChartBarIcon },
      { key: 'tenantNav.productManagement', href: ROUTES.tenant.subscriptionProducts, icon: CubeIcon },
      { key: 'tenantNav.planManagement', href: ROUTES.tenant.plans, icon: RocketLaunchIcon },
      { key: 'tenantNav.priceManagement', href: ROUTES.tenant.prices, icon: CurrencyDollarIcon },
      { key: 'tenantNav.couponManagement', href: ROUTES.tenant.coupons, icon: GiftIcon },
      { key: 'tenantNav.statusManagement', href: ROUTES.tenant.subscriptionStatus, icon: CreditCardIcon },
    ]
  },
]

export default function TenantNavigation() {
  const { t } = useI18n()
  const location = useLocation()
  const { marketEnabled } = useConfig()
  const [expandedSections, setExpandedSections] = useState<string[]>(['tenantNav.appManagement', 'tenantNav.subscriptionManagement'])

  // 
  const navigation = navigationItems.filter(item => {
    if (item.requiresMarket && !marketEnabled) {
      return false
    }
    return true
  })

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionKey)
        ? prev.filter(name => name !== sectionKey)
        : [...prev, sectionKey]
    )
  }

  const isCurrentPath = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const isExpanded = expandedSections.includes(item.key)
    const isCurrent = item.href ? isCurrentPath(item.href) : false
    const hasCurrentChild = item.children?.some(child => child.href && isCurrentPath(child.href))
    const sharedStateClass = hasCurrentChild || isCurrent
      ? 'bg-blue-100 text-blue-900 shadow-sm'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'

    if (item.children) {
      return (
        <div key={item.key}>
          <button
            onClick={() => toggleSection(item.key)}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium rounded-lg transition-colors ${sharedStateClass}`}
            style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
          >
            <div className="flex items-center">
              <item.icon className="h-5 w-5 mr-3" />
              {t(item.key)}
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
        key={item.key}
        to={item.href!}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isCurrent
            ? 'bg-blue-100 text-blue-900 shadow-sm'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
        style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
      >
        <item.icon className="h-5 w-5 mr-3" />
        {t(item.key)}
      </Link>
    )
  }

  return (
    <nav className="space-y-1">
      {navigation.map(item => renderNavigationItem(item))}
    </nav>
  )
}
