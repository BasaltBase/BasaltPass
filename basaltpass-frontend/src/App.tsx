import AppRouter from './router'
import { NotificationProvider } from './contexts/NotificationContext'

function App() {
  return (
    <NotificationProvider>
      <AppRouter />
    </NotificationProvider>
  )
}

export default App 