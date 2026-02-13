import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from '../../../src/shared/contexts/NotificationContext'
import { AuthProvider } from '../../../src/shared/contexts/AuthContext'
import { ConfigProvider } from '../../../src/shared/contexts/ConfigContext'
import AppRouter from './router'

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRouter />
          </NotificationProvider>
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  )
}
