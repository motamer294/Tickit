import {
  Anchor,
  Button,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Box,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify-icon/react'
import { useLogin } from '@/hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const login = useLogin()

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (val) =>
        val.length < 3 ? 'Username must be at least 3 characters' : null,
      password: (val) =>
        val.length < 6 ? 'Password must be at least 6 characters' : null,
    },
  })

  return (
    <Box maw={480} mx="auto" style={{ position: 'relative', padding: '1px' }}>
      {/* 🛡️ WORM TRACK */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="32"
          fill="none"
          stroke="url(#worm-gradient)"
          strokeWidth="2.5"
          strokeDasharray="120 1000"
          style={{ animation: 'worm-move 5s linear infinite' }}
        />
        <defs>
          <linearGradient id="worm-gradient">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="var(--mantine-color-blue-5)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

      <Paper
        radius="32px"
        p={40}
        withBorder
        style={{
          boxShadow: 'var(--mantine-shadow-xl)',
          backgroundColor: 'rgba(var(--mantine-color-body-rgb), 0.85)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack gap={4} mb={30} ta="center">
          <Text size="xl" fw={900} style={{ letterSpacing: '-0.5px' }}>
            Welcome back
          </Text>
          <Text size="sm" c="dimmed" fw={500}>
            Sign in to your Linco account
          </Text>
        </Stack>

        <Button
          variant="default"
          leftSection={<Icon icon="logos:google-icon" width="18" />}
          radius="md"
          h={45}
          fw={600}
          fullWidth
        >
          Continue with Google
        </Button>

        <Divider label="Or secure login" labelPosition="center" my="lg" />

        <form
          onSubmit={form.onSubmit((values) =>
            login.mutate(values, {
              onSuccess: () => navigate('/app'),
            }),
          )}
        >
          <Stack gap="md">
            <TextInput
              required
              label="Username"
              radius="md"
              size="md"
              leftSection={<Icon icon="solar:user-bold-duotone" width="20" />}
              placeholder="Enter your username"
              {...form.getInputProps('username')}
            />

            <PasswordInput
              required
              label="Password"
              radius="md"
              size="md"
              leftSection={
                <Icon icon="solar:lock-password-bold-duotone" width="20" />
              }
              {...form.getInputProps('password')}
            />

            <Button
              type="submit"
              radius="md"
              size="md"
              fullWidth
              h={50}
              loading={login.isPending}
              variant="gradient"
              gradient={{ from: 'blue.6', to: 'cyan.6' }}
              rightSection={<Icon icon="solar:arrow-right-linear" width="20" />}
            >
              Login
            </Button>

            <Group justify="center">
              <Anchor
                component="button"
                type="button"
                c="dimmed"
                size="sm"
                fw={700}
                onClick={() => navigate('/signup')}
              >
                DON'T HAVE AN ACCOUNT? REGISTER
              </Anchor>
            </Group>
          </Stack>
        </form>
      </Paper>

      <style>{`@keyframes worm-move { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }`}</style>
    </Box>
  )
}
