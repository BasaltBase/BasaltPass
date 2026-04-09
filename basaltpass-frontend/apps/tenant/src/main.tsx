import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../../../src/index.css'
import { I18nProvider } from '../../../src/shared/i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
)
