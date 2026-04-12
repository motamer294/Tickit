import { Box, Group, Text, Container, Stack } from '@mantine/core'
import { Outlet } from 'react-router-dom'
import ThemeToggle from '@/components/ThemeToggle'

const AuthLayout = () => {
  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        // Dynamic Mesh Background: Adapts to theme colors via CSS variables
        background: `radial-gradient(circle at 15% 15%, var(--mantine-color-blue-light) 0%, transparent 25%), 
                  radial-gradient(circle at 85% 85%, var(--mantine-color-cyan-light) 0%, transparent 25%),
                  var(--mantine-color-body)`,
      }}
    >
      {/* ✨ MINIMALIST HEADER */}
      <Container
        size="xl"
        w="100%"
        h={90}
        display="flex"
        style={{ alignItems: 'center' }}
      >
        <Group justify="space-between" w="100%">
          <Text
            fw={900}
            size="xl"
            style={{
              letterSpacing: '4px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            }}
          >
            HELP DESK APP
          </Text>
          <ThemeToggle />
        </Group>
      </Container>

      {/* 🌪️ IMMERSIVE CONTENT AREA */}
      <Stack flex={1} justify="center" align="center" px="md" py={40}>
        <Box
          style={{
            width: '100%',
            animation: 'reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1)', // Smooth high-end entrance
          }}
        >
          <Outlet />
        </Box>

        {/* 🏢 ELITE FOOTER */}
        <Group gap="xl" mt={40} style={{ opacity: 0.4 }}>
          {['SECURITY', 'PRIVACY', 'SYSTEM STATUS'].map((link) => (
            <Text
              key={link}
              size="10px"
              fw={800}
              style={{ cursor: 'pointer', letterSpacing: '1px' }}
            >
              {link}
            </Text>
          ))}
        </Group>
      </Stack>

      {/* 🎭 HIGH-END REVEAL ANIMATION */}
      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: scale(0.98) translateY(10px); filter: blur(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
      `}</style>
    </Box>
  )
}

export default AuthLayout
