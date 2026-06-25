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
  Badge,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify-icon/react";
import { useGoogleLogin } from "@react-oauth/google";
import { useSignup, useGoogleAuth } from "@/hooks/useAuth";
import { validatePassword, validateUsername } from "@/utils/validation";

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
};

export default function Signup() {
  const navigate = useNavigate();
  const signup = useSignup();
  const googleAuth = useGoogleAuth();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (response) =>
      googleAuth.mutate(
        { credential: response.access_token },
        { onSuccess: () => navigate("/app") }
      ),
  });

  const form = useForm({
    initialValues: { username: "", password: "", role: "CUSTOMER" },
    validate: {
      username: (val) => {
        const result = validateUsername(val);
        return result.valid ? null : result.error;
      },
      password: (val) => {
        const result = validatePassword(val);
        return result.valid ? null : result.error;
      },
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
              Create account
            </Text>
            <Text size="sm" c="dimmed">
              Join Tickit and start your journey
            </Text>
          </Stack>

          {/* Google SSO */}
          <Button
            variant="default"
            onClick={() => handleGoogleLogin()}
            loading={googleAuth.isPending}
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
            label={<Text size="xs" c="dimmed">or sign up with credentials</Text>}
            labelPosition="center"
            my="lg"
          />

          {/* Form */}
          <form
            onSubmit={form.onSubmit((values) => {
              const payload = {
                username: values.username,
                password: values.password,
                role: (values.role || "CUSTOMER") as "MANAGER" | "EMPLOYEE" | "CUSTOMER",
              };
              signup.mutate(payload, { onSuccess: () => navigate("/app") });
            })}
          >
            <Stack gap="md">
              <TextInput
                required
                label="Username"
                radius="md"
                size="sm"
                placeholder="Choose a username"
                leftSection={<Icon icon="solar:user-bold-duotone" width={16} />}
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
                placeholder="8+ chars, uppercase, number, special char"
                description={
                  <Text size="xs" c="dimmed" mt={3}>
                    Must include: uppercase letter, number, and special character
                  </Text>
                }
                leftSection={<Icon icon="solar:lock-password-bold-duotone" width={16} />}
                styles={{
                  label: { fontSize: 12, fontWeight: 500, marginBottom: 5 },
                  input: {
                    borderColor: "var(--mantine-color-default-border)",
                    transition: "border-color .15s, box-shadow .15s",
                  },
                }}
                {...form.getInputProps("password")}
              />

              {/* Role */}
              <Box>
                <Text size="xs" fw={500} mb={5} c="dimmed">
                  Account type
                </Text>
                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "0.5px solid var(--mantine-color-default-border)",
                    background: "var(--mantine-color-default-hover)",
                  }}
                >
                  <Icon
                    icon="solar:user-circle-bold-duotone"
                    width={16}
                    style={{ color: B.purple, flexShrink: 0 }}
                  />
                  <Text size="sm" style={{ flex: 1 }}>
                    Customer
                  </Text>
                  <Badge
                    size="xs"
                    radius="sm"
                    style={{
                      background: B.purpleLight,
                      color: B.purpleText,
                      fontWeight: 600,
                      fontSize: 10,
                      textTransform: "none",
                    }}
                  >
                    Default
                  </Badge>
                </Box>
                <Text size="xs" c="dimmed" mt={4}>
                  New accounts are created as customers
                </Text>
              </Box>

              <Button
                type="submit"
                radius="md"
                size="sm"
                h={42}
                fullWidth
                loading={signup.isPending}
                style={{ background: B.purpleDark, marginTop: 4 }}
              >
                Create account
              </Button>

              <Group justify="center">
                <Text size="xs" c="dimmed">
                  Already have an account?{" "}
                  <Anchor
                    component="button"
                    type="button"
                    size="xs"
                    fw={600}
                    style={{ color: B.purpleText }}
                    onClick={() => navigate("/login")}
                  >
                    Sign in
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
