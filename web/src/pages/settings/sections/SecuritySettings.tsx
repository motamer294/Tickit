import { useState } from "react";
import {
  Stack,
  Group,
  Text,
  Button,
  PasswordInput,
  Box,
  Divider,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleDeep: "#3C3489",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
  gray: "#B4B2A9",
  grayLight: "#F1EFE8",
  grayText: "#444441",
};

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      tt="uppercase"
      fw={500}
      c="dimmed"
      style={{ letterSpacing: "0.06em" }}
    >
      {children}
    </Text>
  );
}

function SettingsCard({
  icon,
  label,
  description,
  children,
}: {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      style={{
        background: "var(--mantine-color-body)",
        border: "0.5px solid var(--mantine-color-default-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Box
        px="lg"
        py="sm"
        style={{
          borderBottom: "0.5px solid var(--mantine-color-default-border)",
        }}
      >
        <Group gap={8}>
          <Icon icon={icon} width={15} style={{ color: B.purple }} />
          <Box>
            <SLabel>{label}</SLabel>
            {description && (
              <Text size="xs" c="dimmed" mt={1}>
                {description}
              </Text>
            )}
          </Box>
        </Group>
      </Box>
      <Box p="lg">{children}</Box>
    </Box>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 9px",
        borderRadius: 20,
        background: active ? B.greenLight : B.grayLight,
        color: active ? B.greenText : B.grayText,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: active ? B.green : B.gray,
        }}
      />
      {active ? "Enabled" : "Disabled"}
    </span>
  );
}

export default function SecuritySettings() {
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [twoFactor, setTwoFactor] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!passwordForm.current_password) {
      notifications.show({
        title: "Error",
        message: "Current password is required",
        color: "red",
      });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      notifications.show({
        title: "Error",
        message: "Passwords do not match",
        color: "red",
      });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      notifications.show({
        title: "Error",
        message: "Password must be at least 6 characters",
        color: "red",
      });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    notifications.show({
      title: "Password updated",
      message: "Your new password is active",
      color: "green",
    });
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
  };

  return (
    <Stack gap={12}>
      {/* Password */}
      <SettingsCard
        icon="solar:lock-password-bold-duotone"
        label="Change password"
        description="Update your login password"
      >
        <Stack gap="md">
          <PasswordInput
            label={
              <Text size="xs" fw={500} mb={4}>
                Current password
              </Text>
            }
            placeholder="Enter your current password"
            value={passwordForm.current_password}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                current_password: e.currentTarget.value,
              })
            }
            styles={{ input: { fontSize: 13 } }}
          />
          <PasswordInput
            label={
              <Text size="xs" fw={500} mb={4}>
                New password
              </Text>
            }
            placeholder="At least 6 characters"
            value={passwordForm.new_password}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                new_password: e.currentTarget.value,
              })
            }
            styles={{ input: { fontSize: 13 } }}
          />
          <PasswordInput
            label={
              <Text size="xs" fw={500} mb={4}>
                Confirm new password
              </Text>
            }
            placeholder="Repeat your new password"
            value={passwordForm.confirm_password}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                confirm_password: e.currentTarget.value,
              })
            }
            error={
              passwordForm.confirm_password &&
              passwordForm.new_password !== passwordForm.confirm_password
                ? "Passwords do not match"
                : undefined
            }
            styles={{ input: { fontSize: 13 } }}
          />
          <Divider />
          <Group justify="flex-end">
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              loading={saving}
              onClick={handleChangePassword}
              leftSection={<Icon icon="solar:lock-bold-duotone" width={14} />}
            >
              Update password
            </Button>
          </Group>
        </Stack>
      </SettingsCard>

      {/* 2FA */}
      <SettingsCard
        icon="solar:key-bold-duotone"
        label="Two-factor authentication"
        description="Add an extra layer of security to your account"
      >
        <Group
          justify="space-between"
          align="center"
          px="md"
          py="sm"
          style={{
            borderRadius: 8,
            background: "var(--mantine-color-default-hover)",
            border: "0.5px solid var(--mantine-color-default-border)",
          }}
        >
          <Box>
            <Group gap={8} mb={2}>
              <Text size="sm" fw={500}>
                Authenticator app
              </Text>
              <StatusPill active={twoFactor} />
            </Group>
            <Text size="xs" c="dimmed">
              {twoFactor
                ? "Your account is protected with two-factor authentication"
                : "Use an authenticator app to generate one-time codes"}
            </Text>
          </Box>
          <Button
            size="xs"
            style={
              twoFactor
                ? { background: B.red, border: "none" }
                : { background: B.purpleDark, border: "none" }
            }
            onClick={() => {
              setTwoFactor((v) => !v);
              notifications.show({
                title: twoFactor ? "2FA disabled" : "2FA enabled",
                message: twoFactor
                  ? "Two-factor authentication has been turned off"
                  : "Two-factor authentication is now active",
                color: twoFactor ? "yellow" : "green",
              });
            }}
          >
            {twoFactor ? "Disable" : "Enable 2FA"}
          </Button>
        </Group>
      </SettingsCard>

      {/* Active sessions */}
      <SettingsCard
        icon="solar:devices-bold-duotone"
        label="Active sessions"
        description="Devices currently logged into your account"
      >
        <Stack gap={8}>
          {[
            {
              device: "Chrome on macOS",
              location: "Cairo, Egypt",
              current: true,
              time: "Now",
            },
            {
              device: "Firefox on Windows",
              location: "Alexandria, Egypt",
              current: false,
              time: "2 days ago",
            },
          ].map((s, i) => (
            <Group
              key={i}
              justify="space-between"
              align="center"
              px="sm"
              py="sm"
              style={{
                borderRadius: 8,
                background: "var(--mantine-color-default-hover)",
                border: "0.5px solid var(--mantine-color-default-border)",
              }}
            >
              <Group gap={10}>
                <Icon
                  icon="solar:monitor-bold-duotone"
                  width={16}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
                <Box>
                  <Group gap={8}>
                    <Text size="sm" fw={500}>
                      {s.device}
                    </Text>
                    {s.current && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 10,
                          background: B.greenLight,
                          color: B.greenText,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {s.location} · {s.time}
                  </Text>
                </Box>
              </Group>
              {!s.current && (
                <Button
                  size="xs"
                  variant="default"
                  style={{ color: B.red, borderColor: `${B.red}44` }}
                >
                  Revoke
                </Button>
              )}
            </Group>
          ))}
          <Button
            size="xs"
            variant="subtle"
            style={{ color: B.red, alignSelf: "flex-start" }}
          >
            Revoke all other sessions
          </Button>
        </Stack>
      </SettingsCard>
    </Stack>
  );
}
