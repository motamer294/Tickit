import { ActionIcon, Menu, Text } from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { useThemeStore } from '@/store/theme.store'

export default function ThemeToggle() {
  const { mode, setMode } = useThemeStore()

  // Icon mapping
  const modeIcons = {
    light: 'solar:sun-2-bold-duotone',
    dark: 'solar:moon-bold-duotone',
  }

  return (
    <Menu
      shadow="lg"
      width={150}
      radius="md"
      transitionProps={{ transition: 'pop-top-right', duration: 150 }}
      withinPortal
    >
      <Menu.Target>
        <ActionIcon
          variant="default"
          size="lg"
          radius="md"
          aria-label="Toggle theme"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = 'translateY(-1px)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = 'translateY(0)')
          }
        >
          <Icon
            icon={modeIcons[mode as keyof typeof modeIcons]}
            width="22"
            style={{ color: 'var(--mantine-color-anchor)' }}
          />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown p={6}>
        <Menu.Label>Appearance</Menu.Label>

        {(['light', 'dark'] as const).map((item) => (
          <Menu.Item
            key={item}
            onClick={() => setMode(item)}
            leftSection={
              <Icon
                icon={modeIcons[item]}
                width="20"
                style={{ opacity: mode === item ? 1 : 0.6 }}
              />
            }
            rightSection={
              mode === item && (
                <Icon
                  icon="solar:check-read-linear"
                  width="16"
                  color="var(--mantine-color-blue-filled)"
                />
              )
            }
            style={{
              fontWeight: mode === item ? 600 : 400,
              backgroundColor:
                mode === item
                  ? 'var(--mantine-color-default-hover)'
                  : 'transparent',
            }}
          >
            <Text size="sm">
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}
