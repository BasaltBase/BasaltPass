import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from '../../../src/shared/contexts/NotificationContext'
import { AuthProvider } from '../../../src/shared/contexts/AuthContext'
import { ConfigProvider } from '../../../src/shared/contexts/ConfigContext'
import { DialogProvider } from '../../../src/shared/contexts/DialogContext'
import AppRouter from './router'

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <AuthProvider>
          <DialogProvider>
            <NotificationProvider>
              <AppRouter />
            </NotificationProvider>
          </DialogProvider>
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  )
}
