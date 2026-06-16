import {
  AppShell,
  Burger,
  Group,
  Text,
  Stack,
  Box,
  ScrollArea,
  Avatar,
  Divider,
} from '@mantine/core'
import logoSvg from '@/assets/logo.svg'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '@iconify-icon/react'
import { useAuth } from '@/hooks/useAuth'
import ThemeToggle from '@/components/ThemeToggle'
import { NotificationCenter } from '@/components/NotificationCenter'

// ─── Brand ─────────────────────────────────────────────────────────────────────

const BRAND = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleLight: '#EEEDFE',
  purpleText:  '#3C3489',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
  redText:     '#791F1F',
}

// ─── Nav data ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'solar:widget-5-bold-duotone',          path: '/app/dashboard' },
  { label: 'Tickets',   icon: 'solar:bug-minimalistic-bold-duotone',  path: '/app/tickets'   },
]

const ADMIN_ITEMS = [
  { label: 'Users',      icon: 'solar:users-group-rounded-bold-duotone', path: '/app/admin/users'      },
  { label: 'Teams',      icon: 'solar:people-nearby-bold-duotone',        path: '/app/admin/teams'      },
  { label: 'Categories', icon: 'solar:folder-bold-duotone',               path: '/app/admin/categories' },
  { label: 'Tags',       icon: 'solar:bookmark-bold-duotone',             path: '/app/admin/tags'       },
  { label: 'SLAs',       icon: 'solar:stopwatch-bold-duotone',            path: '/app/admin/slas'       },
  { label: 'Audit Log',  icon: 'solar:history-bold-duotone',              path: '/app/admin/audit-logs' },
]

const BOTTOM_ITEMS = [
  { label: 'Profile',  icon: 'solar:user-bold-duotone',     path: '/app/profile'   },
]

// ─── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  label,
  icon,
  active,
  onClick,
  danger = false,
}: {
  label: string
  icon: string
  active?: boolean
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 12px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        transition: 'all .13s',
        background: active
          ? BRAND.purpleLight
          : 'transparent',
        color: danger
          ? BRAND.red
          : active
          ? BRAND.purpleText
          : 'var(--mantine-color-text)',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background =
            danger
              ? BRAND.redLight
              : 'var(--mantine-color-default-hover)'
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {/* Left accent bar when active */}
      <span
        style={{
          position: 'absolute',
          left: 0,
          width: 3,
          height: 28,
          borderRadius: '0 3px 3px 0',
          background: active ? BRAND.purple : 'transparent',
          transition: 'background .13s',
        }}
      />
      <Icon
        icon={icon}
        width={18}
        style={{
          color: danger ? BRAND.red : active ? BRAND.purple : 'var(--mantine-color-dimmed)',
          flexShrink: 0,
        }}
      />
      <span style={{ lineHeight: 1.3 }}>{label}</span>
    </button>
  )
}

// ─── Layout ────────────────────────────────────────────────────────────────────

const DashboardLayout = () => {
  const [opened, { toggle }] = useDisclosure()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const go = (path: string) => {
    navigate(path)
    if (opened) toggle()
  }

  const initials = (user?.username ?? 'G')
    .split(/[\s._-]/)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel =
    user?.role === 'MANAGER'
      ? 'Manager'
      : user?.role === 'EMPLOYEE'
      ? 'Employee'
      : user?.role === 'CUSTOMER'
      ? 'Customer'
      : 'User'

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={0}
      transitionDuration={300}
      transitionTimingFunction="ease"
    >
      {/* ── Header ── */}
      <AppShell.Header
        style={{
          borderBottom: '0.5px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap={10}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

            {/* Logo mark */}
            <img src={logoSvg} alt="TicketMe" style={{ height: 26, width: 'auto', display: 'block' }} />
          </Group>

          <Group gap={6}>
            <NotificationCenter />
            <ThemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Sidebar ── */}
      <AppShell.Navbar
        style={{
          borderRight: '0.5px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Scrollable nav area */}
        <Box style={{ flex: 1, overflow: 'hidden' }}>
          <ScrollArea h="100%" scrollbarSize={4}>
            <Stack gap={2} p="sm" pt="md" style={{ position: 'relative' }}>
              {/* Main nav */}
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.path}
                  label={item.label}
                  icon={item.icon}
                  active={pathname.startsWith(item.path)}
                  onClick={() => go(item.path)}
                />
              ))}

              {/* Admin section */}
              {user?.role === 'MANAGER' && (
                <>
                  <Box pt="sm" pb={2} px="xs">
                    <Text
                      size="xs"
                      fw={600}
                      c="dimmed"
                      tt="uppercase"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      Administration
                    </Text>
                  </Box>
                  {ADMIN_ITEMS.map((item) => (
                    <NavItem
                      key={item.path}
                      label={item.label}
                      icon={item.icon}
                      active={pathname.startsWith(item.path)}
                      onClick={() => go(item.path)}
                    />
                  ))}
                </>
              )}
            </Stack>
          </ScrollArea>
        </Box>

        {/* User section pinned to bottom */}
        <Box
          style={{
            borderTop: '0.5px solid var(--mantine-color-default-border)',
            padding: '12px 8px 8px',
            flexShrink: 0,
          }}
        >
          {/* User identity row */}
          <Group gap={10} px={4} mb={8}>
            <Avatar
              size={32}
              radius="xl"
              style={{
                background: BRAND.purpleLight,
                color: BRAND.purpleText,
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Text size="sm" fw={600} style={{ lineHeight: 1.2 }} truncate>
                {user?.username ?? 'Guest'}
              </Text>
              <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                {roleLabel}
              </Text>
            </Box>
          </Group>

          <Stack gap={2}>
            {BOTTOM_ITEMS.map((item) => (
              <NavItem
                key={item.path}
                label={item.label}
                icon={item.icon}
                active={pathname === item.path}
                onClick={() => go(item.path)}
              />
            ))}

            {/* Divider before logout */}
            <Box pt={4} pb={2}>
              <Divider style={{ opacity: 0.5 }} />
            </Box>

            <NavItem
              label="Log out"
              icon="solar:logout-3-bold-duotone"
              onClick={handleLogout}
              danger
            />
          </Stack>
        </Box>
      </AppShell.Navbar>

      {/* ── Main content ── */}
      <AppShell.Main
        style={{ background: 'var(--mantine-color-default-hover)' }}
      >
        <Box
          style={{
            maxWidth: 1600,
            margin: '0 auto',
            minHeight: '100%',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <Outlet />
        </Box>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0);   }
          }
          button { position: relative; }
        `}</style>
      </AppShell.Main>
    </AppShell>
  )
}

export default DashboardLayout
