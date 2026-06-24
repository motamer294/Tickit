import {
  Button,
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
import { useSignup } from "@/hooks/useAuth";
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
