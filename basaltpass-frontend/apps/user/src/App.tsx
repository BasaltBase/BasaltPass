import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from '../../../src/contexts/NotificationContext'
import { AuthProvider } from '../../../src/contexts/AuthContext'
import AppRouter from './router'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRouter />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
