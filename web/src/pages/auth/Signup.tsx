import {
  Anchor,
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Box,
  Select,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify-icon/react'
import { useSignup } from '@/hooks/useAuth'

export default function Signup() {
  const navigate = useNavigate()
  const signup = useSignup()

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      role: 'CUSTOMER',
    },
    validate: {
      username: (val) =>
        val.length < 3 ? 'Username must be at least 3 characters' : null,
      password: (val) => (val.length < 6 ? 'Password too short' : null),
    },
  })

  return (
    <Box maw={480} mx="auto" style={{ position: 'relative', padding: '1px' }}>
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
          stroke="url(#signup-worm)"
          strokeWidth="2.5"
          strokeDasharray="120 1000"
          style={{ animation: 'worm-move 5s linear infinite' }}
        />
        <defs>
          <linearGradient id="signup-worm">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="var(--mantine-color-cyan-5)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

      <Paper
        radius="32px"
        p={40}
        withBorder
        style={{
          backgroundColor: 'rgba(var(--mantine-color-body-rgb), 0.85)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack gap={4} mb={30} ta="center">
          <Text size="xl" fw={900}>
            Create account
          </Text>
          <Text size="sm" c="dimmed" fw={500}>
            Join us and start your journey
          </Text>
        </Stack>

        <form
          onSubmit={form.onSubmit((values) => {
            const payload = {
              username: values.username,
              password: values.password,
              role: (values.role || 'CUSTOMER') as
                | 'MANAGER'
                | 'EMPLOYEE'
                | 'CUSTOMER',
            }
            console.log('[Signup] Sending role to backend:', payload.role)
            signup.mutate(payload, {
              onSuccess: () => navigate('/app'),
            })
          })}
        >
          <Stack gap="md">
            <TextInput
              required
              label="Username"
              radius="md"
              size="md"
              placeholder="Choose a username"
              leftSection={<Icon icon="solar:user-bold-duotone" width="20" />}
              {...form.getInputProps('username')}
            />

            <PasswordInput
              required
              label="Password"
              radius="md"
              size="md"
              placeholder="At least 6 characters"
              leftSection={
                <Icon icon="solar:lock-password-bold-duotone" width="20" />
              }
              {...form.getInputProps('password')}
            />

            <Select
              label="Account Type"
              placeholder="Select your role"
              data={[
                { value: 'CUSTOMER', label: 'Customer' },
                { value: 'EMPLOYEE', label: 'Employee' },
                { value: 'MANAGER', label: 'Manager' },
              ]}
              radius="md"
              size="md"
              {...form.getInputProps('role')}
            />

            <Button
              type="submit"
              radius="md"
              size="md"
              fullWidth
              h={50}
              loading={signup.isPending}
              variant="gradient"
              gradient={{ from: 'cyan.6', to: 'blue.6' }}
            >
              Create Account
            </Button>

            <Group justify="center">
              <Anchor
                component="button"
                type="button"
                c="dimmed"
                size="sm"
                fw={700}
                onClick={() => navigate('/login')}
              >
                ALREADY HAVE AN ACCOUNT? LOGIN
              </Anchor>
            </Group>
          </Stack>
        </form>
      </Paper>

      <style>{`@keyframes worm-move { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }`}</style>
    </Box>
  )
}
