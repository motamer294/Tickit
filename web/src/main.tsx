import ReactDOM from 'react-dom/client'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ColorSchemeScript } from '@mantine/core'
import '@mantine/core/styles.css'
import '@/styles/global.css'
import App from '@/App'
import { createApiClient } from '@/api/config'
import { useAuthStore } from '@/store/auth.store'

// Initialize API client with DYNAMIC token getter
// Important: Don't capture store reference - always get fresh state!
createApiClient(
  () => useAuthStore.getState().accessToken,
  () => useAuthStore.getState().logout(),
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
