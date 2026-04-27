import {
  AppShell,
  Burger,
  Group,
  Text,
  NavLink,
  Stack,
  Box,
  ScrollArea,
  Avatar, // Added for a better look
  Divider,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '@iconify-icon/react'
import { useAuth } from '@/hooks/useAuth'
import ThemeToggle from '@/components/ThemeToggle'
import { NotificationCenter } from '@/components/NotificationCenter'

const navData = [
  {
    label: 'Dashboard',
    icon: 'solar:widget-5-bold-duotone',
    path: '/app/dashboard',
  },
  {
    label: 'Tickets',
    icon: 'solar:bug-minimalistic-bold-duotone',
    path: '/app/tickets',
  },
]

const adminNavData = [
  {
    label: 'Users',
    icon: 'solar:users-group-rounded-bold-duotone',
    path: '/app/admin/users',
  },
  {
    label: 'SLAs',
    icon: 'solar:stopwatch-bold-duotone',
    path: '/app/admin/slas',
  },
  {
    label: 'Audit Log',
    icon: 'solar:history-bold-duotone',
    path: '/app/admin/audit-logs',
  },
]

const DashboardLayout = () => {
  const [opened, { toggle }] = useDisclosure()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login') // Redirect after clearing store
  }

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      transitionDuration={500}
      transitionTimingFunction="ease"
    >
      {/* 🔝 HEADER */}
      <AppShell.Header
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={900} size="xl" style={{ letterSpacing: '2px', color: 'var(--mantine-primary-color-filled)' }}>
              TICKETME
            </Text>
          </Group>

          <Group gap="sm">
            <NotificationCenter />
            <ThemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      {/* ⬅️ SIDEBAR */}
      <AppShell.Navbar p="xs">
        <AppShell.Section component={ScrollArea} grow>
          <Stack gap="xs" mt="md">
            {navData.map((item) => (
              <NavLink
                key={item.label}
                label={item.label}
                active={pathname.startsWith(item.path)}
                leftSection={<Icon icon={item.icon} width="22" />}
                onClick={() => {
                  navigate(item.path)
                  if (opened) toggle()
                }}
                variant="light"
                h={50}
                styles={{ label: { fontWeight: 600 } }}
              />
            ))}

            {/* Admin Section */}
            {user?.role === 'MANAGER' && (
              <>
                <Divider my="sm" />
                <Text size="xs" fw={700} c="dimmed" px="md" py="sm" tt="uppercase">
                  Administration
                </Text>
                {adminNavData.map((item) => (
                  <NavLink
                    key={item.label}
                    label={item.label}
                    active={pathname.startsWith(item.path)}
                    leftSection={<Icon icon={item.icon} width="22" />}
                    onClick={() => {
                      navigate(item.path)
                      if (opened) toggle()
                    }}
                    variant="light"
                    h={50}
                    styles={{ label: { fontWeight: 600 } }}
                  />
                ))}
              </>
            )}
          </Stack>
        </AppShell.Section>

        {/* 👤 USER & LOGOUT SECTION */}
        <AppShell.Section
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          pt="md"
        >
          <Box px="xs" pb="xs">
            <Group mb={15} px="xs" gap="sm">
              <Avatar color="blue" radius="xl" size="sm">
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Stack gap={0}>
                <Text size="sm" fw={700}>
                  {user?.username || 'Guest User'}
                </Text>
                <Text size="xs" c="dimmed">
                  {user?.role || 'User'}
                </Text>
              </Stack>
            </Group>

            <NavLink
              label="Profile"
              leftSection={<Icon icon="solar:user-bold-duotone" width="22" />}
              onClick={() => {
                navigate('/app/profile')
                if (opened) toggle()
              }}
              active={pathname === '/app/profile'}
            />
            <NavLink
              label="Settings"
              leftSection={<Icon icon="solar:settings-bold-duotone" width="22" />}
              onClick={() => navigate('/app/settings')}
              active={pathname === '/app/settings'}
            />
            <NavLink
              label="Logout"
              color="red"
              variant="subtle"
              leftSection={<Icon icon="solar:logout-3-bold-duotone" width="22" />}
              onClick={handleLogout}
              mt="xs"
            />
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* 🚀 MAIN CONTENT AREA */}
      <AppShell.Main bg="var(--mantine-color-gray-light)">
        <Box
          style={{
            maxWidth: '1600px',
            margin: '0 auto',
            animation: 'fadeIn 0.5s ease',
          }}
        >
          <Outlet />
        </Box>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </AppShell.Main>
    </AppShell>
  )
}

export default DashboardLayout
