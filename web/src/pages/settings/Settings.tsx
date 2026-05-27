import { useState } from 'react'
import { Container, Text, Stack, Box, Group, Avatar } from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useAuth } from '@/hooks/useAuth'
import AccountSettings   from './sections/AccountSettings'
import SecuritySettings  from './sections/SecuritySettings'
import AppearanceSettings from './sections/AppearanceSettings'
import TeamsAndRoles     from './sections/TeamsAndRoles'
import SupportSettings   from './sections/SupportSettings'

// ─── Brand ────────────────────────────────────────────────────────────────────

const B = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleDeep:  '#3C3489',
  purpleLight: '#EEEDFE',
}

const AVATAR_PALETTES = [
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#FAECE7', color: '#712B13' },
  { bg: '#E6F1FB', color: '#0C447C' },
]

function getInitials(name = '') {
  return name.split(/[\s._-]/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}
function getAvatarPal(name = '') {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_PALETTES[idx % AVATAR_PALETTES.length]
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'account',    label: 'Account',       icon: 'solar:user-bold-duotone'                      },
  { id: 'security',   label: 'Security',      icon: 'solar:shield-bold-duotone'                    },
  { id: 'appearance', label: 'Appearance',    icon: 'solar:palette-bold-duotone'                   },
  { id: 'teams',      label: 'Teams & Roles', icon: 'solar:users-group-rounded-bold-duotone'       },
  { id: 'support',    label: 'Support',       icon: 'solar:question-circle-bold-duotone'           },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const pal = getAvatarPal(user?.username ?? '')

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">

        {/* ── Page header ── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>Settings</Text>
            <Text size="sm" c="dimmed" mt={2}>Manage your account, security, and preferences</Text>
          </Box>
          {/* User identity chip */}
          <Group gap={8} px="sm" py={6} style={{ borderRadius: 20, background: B.purpleLight, border: `0.5px solid ${B.purple}33` }}>
            <Avatar size={22} radius="xl" style={{ ...pal, fontSize: 8, fontWeight: 700 }}>
              {getInitials(user?.username)}
            </Avatar>
            <Text size="xs" fw={500} style={{ color: B.purpleDeep }}>{user?.username}</Text>
          </Group>
        </Group>

        {/* ── Main layout: vertical nav + content ── */}
        <Box style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Sidebar nav */}
          <Box style={{
            background: 'var(--mantine-color-body)',
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 12,
            padding: 8,
            position: 'sticky',
            top: 80,
          }}>
            <Stack gap={2}>
              {TABS.map(tab => {
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      background: active ? B.purpleLight : 'transparent',
                      color: active ? B.purpleDeep : 'var(--mantine-color-dimmed)',
                      textAlign: 'left',
                      transition: 'all .13s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--mantine-color-default-hover)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    {/* Active indicator bar */}
                    <span style={{
                      position: 'absolute', left: 0, width: 3, height: 22,
                      borderRadius: '0 3px 3px 0',
                      background: active ? B.purple : 'transparent',
                    }} />
                    <Icon
                      icon={tab.icon}
                      width={16}
                      style={{ color: active ? B.purple : 'var(--mantine-color-dimmed)', flexShrink: 0 }}
                    />
                    {tab.label}
                  </button>
                )
              })}
            </Stack>
          </Box>

          {/* Content panel */}
          <Box>
            {activeTab === 'account'    && <AccountSettings />}
            {activeTab === 'security'   && <SecuritySettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'teams'      && <TeamsAndRoles />}
            {activeTab === 'support'    && <SupportSettings />}
          </Box>

        </Box>
      </Stack>
    </Container>
  )
}
