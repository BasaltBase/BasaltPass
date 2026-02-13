import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from '../../../src/shared/contexts/NotificationContext'
import { AuthProvider } from '../../../src/shared/contexts/AuthContext'
import { ConfigProvider } from '../../../src/shared/contexts/ConfigContext'
import AppRouter from './router'
import { exchangeConsole } from '../../../src/shared/api/console'
import { setAccessToken } from '../../../src/shared/utils/auth'

function ConsoleCodeGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        const res = await exchangeConsole(code)
        setAccessToken(res.access_token)
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url.toString())
      }
      setReady(true)
    }
    run().catch(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在进入租户控制台...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ConsoleCodeGate>
      <BrowserRouter>
        <ConfigProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppRouter />
            </NotificationProvider>
          </AuthProvider>
        </ConfigProvider>
      </BrowserRouter>
    </ConsoleCodeGate>
  )
}
