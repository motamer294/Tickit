import {
  Button,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Box,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify-icon/react";
import { useLogin } from "@/hooks/useAuth";

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
};

export default function Login() {
  const navigate = useNavigate();
  const login = useLogin();

  const form = useForm({
    initialValues: { username: "", password: "" },
    validate: {
      username: (val) =>
        val.length < 3 ? "Username must be at least 3 characters" : null,
      password: (val) =>
        val.length < 6 ? "Password must be at least 6 characters" : null,
    },
  });

  return (
    <Box maw={440} mx="auto">
      <Paper
        radius={20}
        p={36}
        withBorder
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--mantine-color-body)",
          border: "0.5px solid var(--mantine-color-default-border)",
        }}
      >
        {/* Light bar */}
        <div className="auth-light-bar" />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Header */}
          <Stack gap={4} mb={28} ta="center">
            <Text size="xl" fw={700} style={{ letterSpacing: "-0.3px" }}>
              Welcome back
            </Text>
            <Text size="sm" c="dimmed">
              Sign in to your Tickit account
            </Text>
          </Stack>

          {/* Google SSO */}
          <Button
            variant="default"
            leftSection={
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            }
            radius="md"
            h={42}
            fullWidth
            fw={500}
            fz="sm"
          >
            Continue with Google
          </Button>

          <Divider
            label={<Text size="xs" c="dimmed">or sign in with credentials</Text>}
            labelPosition="center"
            my="lg"
          />

          {/* Form */}
          <form
            onSubmit={form.onSubmit((values) =>
              login.mutate(values, { onSuccess: () => navigate("/app") }),
            )}
          >
            <Stack gap="md">
              <TextInput
                required
                label="Username"
                radius="md"
                size="sm"
                leftSection={<Icon icon="solar:user-bold-duotone" width={16} />}
                placeholder="Enter your username"
                styles={{
                  label: { fontSize: 12, fontWeight: 500, marginBottom: 5 },
                  input: {
                    borderColor: "var(--mantine-color-default-border)",
                    transition: "border-color .15s, box-shadow .15s",
                  },
                }}
                {...form.getInputProps("username")}
              />

              <PasswordInput
                required
                label="Password"
                radius="md"
                size="sm"
                leftSection={<Icon icon="solar:lock-password-bold-duotone" width={16} />}
                placeholder="Enter your password"
                styles={{
                  label: { fontSize: 12, fontWeight: 500, marginBottom: 5 },
                  input: {
                    borderColor: "var(--mantine-color-default-border)",
                    transition: "border-color .15s, box-shadow .15s",
                  },
                }}
                {...form.getInputProps("password")}
              />

              <Button
                type="submit"
                radius="md"
                size="sm"
                h={42}
                fullWidth
                loading={login.isPending}
                rightSection={
                  !login.isPending && (
                    <Icon icon="solar:arrow-right-linear" width={16} />
                  )
                }
                style={{ background: B.purpleDark, marginTop: 4 }}
              >
                Sign in
              </Button>

              <Group justify="center">
                <Text size="xs" c="dimmed">
                  Don't have an account?{" "}
                  <Anchor
                    component="button"
                    type="button"
                    size="xs"
                    fw={600}
                    style={{ color: B.purpleText }}
                    onClick={() => navigate("/signup")}
                  >
                    Register here
                  </Anchor>
                </Text>
              </Group>
            </Stack>
          </form>
        </div>
      </Paper>

      <style>{`
        .auth-light-bar {
          position: absolute;
          top: -60%;
          left: 0;
          width: 90px;
          height: 220%;
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 255, 255, 0.04) 30%,
            rgba(255, 255, 255, 0.18) 50%,
            rgba(255, 255, 255, 0.04) 70%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 0;
          animation: light-sweep 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes light-sweep {
          0%   { transform: translateX(-120px) skewX(-12deg); opacity: 0; }
          6%   { opacity: 1; }
          44%  { opacity: 1; }
          52%  { transform: translateX(560px) skewX(-12deg); opacity: 0; }
          100% { transform: translateX(560px) skewX(-12deg); opacity: 0; }
        }
      `}</style>
    </Box>
  );
}
