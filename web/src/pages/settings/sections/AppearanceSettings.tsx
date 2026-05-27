import { useState } from 'react'
import { Paper, Stack, Group, Text, Select, ThemeIcon } from '@mantine/core'
import { Icon } from '@iconify-icon/react'

export default function AppearanceSettings() {
  const [language, setLanguage] = useState('en')

  return (
    <Stack gap="lg">
      <Paper p="lg" radius="md" withBorder>
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" variant="light" color="violet">
            <Icon icon="solar:language-bold-duotone" width={18} />
          </ThemeIcon>
          <div>
            <Text fw={500} size="sm">Language</Text>
            <Text c="dimmed" size="xs">Choose your preferred language</Text>
          </div>
        </Group>
        <Stack gap="md" pl="lg">
          <Select
            label="Language"
            placeholder="Select language"
            value={language}
            onChange={(val) => setLanguage(val || 'en')}
            data={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'ja', label: '日本語' },
              { value: 'zh', label: '中文' },
            ]}
          />
        </Stack>
      </Paper>
      </Stack>)
      }
