import ReactDOM from 'react-dom/client'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import '@mantine/core/styles.css'
import '@/styles/global.css'
import App from '@/App'
import { createApiClient } from '@/api/config'
import { useAuthStore } from '@/store/auth.store'
import { validateTokenApi } from '@/api/auth.api'

// Initialize API client with DYNAMIC token getter
// Important: Don't capture store reference - always get fresh state!
createApiClient(
  () => useAuthStore.getState().accessToken,
  () => useAuthStore.getState().logout(),
)

// Validate stored token on startup
const initializeAuth = async () => {
  try {
    const token = useAuthStore.getState().accessToken
    if (token) {
      const result = await validateTokenApi(token)
      if (!result.valid) {
        // Token is invalid, logout the user
        useAuthStore.getState().logout()
      }
    }
  } catch (error) {
    // On any error, treat as invalid token
    useAuthStore.getState().logout()
  }
}

// Run initialization before rendering
initializeAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})

