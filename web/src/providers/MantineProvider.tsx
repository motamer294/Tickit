import { MantineProvider as BaseProvider, createTheme, ColorSchemeScript } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { useThemeStore } from '@/store/theme.store'

// Ensure CSS imports are present
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

interface Props {
  children: React.ReactNode
}

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Outfit, sans-serif',
})

export function MantineProvider({ children }: Props) {
  const mode = useThemeStore((s) => s.mode)

  return (
    <>
      <ColorSchemeScript defaultColorScheme="auto" />
      <BaseProvider
        theme={theme}
        forceColorScheme={mode}
        defaultColorScheme="light"
      >
        <Notifications position="top-right" zIndex={2000} />
        <ModalsProvider>{children}</ModalsProvider>
      </BaseProvider>
    </>
  )
}
