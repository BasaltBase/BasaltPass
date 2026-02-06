import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router'
import { NotificationProvider } from './shared/contexts/NotificationContext'
import { AuthProvider } from './shared/contexts/AuthContext'

function App() {
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

export default App 