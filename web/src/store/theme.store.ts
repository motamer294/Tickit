import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark'

type ThemeState = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState, [['zustand/persist', { mode: ThemeMode }]]>(
  persist(
    (set) => ({
      mode: 'light',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'theme-mode-storage',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
)
