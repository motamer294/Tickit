import { useState } from "react";
import {
  Stack,
  Group,
  Text,
  TextInput,
  Button,
  Avatar,
  Box,
  Divider,
  FileInput,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useAuth } from "@/hooks/useAuth";
import { notifications } from "@mantine/notifications";

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
};

const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#E6F1FB", color: "#0C447C" },
];
function getInitials(name = "") {
  return (
    name
      .split(/[\s._-]/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}
function getAvatarPal(name = "") {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
}

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

export default function AccountSettings() {
  const { user } = useAuth();
  const pal = getAvatarPal(user?.username ?? "");
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    notifications.show({
      title: "Profile updated",
      message: "Your changes have been saved",
      color: "green",
    });
  };

  return (
    <Stack gap={12}>
      {/* Avatar */}
      <SettingsCard
        icon="solar:camera-bold-duotone"
        label="Profile picture"
        description="Update your avatar"
      >
        <Group gap={20} align="center">
          <Avatar
            size={64}
            radius="xl"
            style={{ ...pal, fontSize: 20, fontWeight: 700, flexShrink: 0 }}
          >
            {getInitials(user?.username)}
          </Avatar>
          <Box style={{ flex: 1 }}>
            <FileInput
              placeholder="Choose an image file…"
              accept="image/*"
              leftSection={
                <Icon
                  icon="solar:upload-bold-duotone"
                  width={14}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
              }
              styles={{ input: { fontSize: 13 } }}
            />
            <Text size="xs" c="dimmed" mt={4}>
              JPG, PNG or WebP · Max 2 MB
            </Text>
          </Box>
        </Group>
      </SettingsCard>

      {/* Profile info */}
      <SettingsCard
        icon="solar:user-bold-duotone"
        label="Profile information"
        description="Update your name and email address"
      >
        <Stack gap="md">
          <Group grow gap="md">
            <TextInput
              label={
                <Text size="xs" fw={500} mb={4}>
                  First name
                </Text>
              }
              placeholder="John"
              value={profile.first_name}
              onChange={(e) =>
                setProfile({ ...profile, first_name: e.currentTarget.value })
              }
              styles={{ input: { fontSize: 13 } }}
            />
            <TextInput
              label={
                <Text size="xs" fw={500} mb={4}>
                  Last name
                </Text>
              }
              placeholder="Doe"
              value={profile.last_name}
              onChange={(e) =>
                setProfile({ ...profile, last_name: e.currentTarget.value })
              }
              styles={{ input: { fontSize: 13 } }}
            />
          </Group>
          <TextInput
            label={
              <Text size="xs" fw={500} mb={4}>
                Email address
              </Text>
            }
            placeholder="you@company.com"
            type="email"
            value={profile.email}
            onChange={(e) =>
              setProfile({ ...profile, email: e.currentTarget.value })
            }
            leftSection={
              <Icon
                icon="solar:letter-linear"
                width={14}
                style={{ color: "var(--mantine-color-dimmed)" }}
              />
            }
            styles={{ input: { fontSize: 13 } }}
          />
          <TextInput
            label={
              <Text size="xs" fw={500} mb={4}>
                Username
              </Text>
            }
            value={user?.username ?? ""}
            disabled
            description="Username cannot be changed"
            leftSection={
              <Icon
                icon="solar:at-linear"
                width={14}
                style={{ color: "var(--mantine-color-dimmed)" }}
              />
            }
            styles={{ input: { fontSize: 13 } }}
          />
          <Divider />
          <Group justify="flex-end">
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              loading={saving}
              onClick={handleSave}
              leftSection={
                <Icon icon="solar:check-circle-bold-duotone" width={14} />
              }
            >
              Save changes
            </Button>
          </Group>
        </Stack>
      </SettingsCard>

      {/* Danger zone */}
      <SettingsCard
        icon="solar:danger-triangle-bold-duotone"
        label="Danger zone"
        description="Irreversible account actions"
      >
        <Group
          justify="space-between"
          align="center"
          px="md"
          py="sm"
          style={{
            borderRadius: 8,
            background: B.redLight,
            border: `0.5px solid ${B.red}33`,
          }}
        >
          <Box>
            <Text size="sm" fw={500} style={{ color: B.redText }}>
              Delete account
            </Text>
            <Text size="xs" style={{ color: B.redText, opacity: 0.7 }}>
              Permanently remove your account and all data
            </Text>
          </Box>
          <Button size="xs" style={{ background: B.red, border: "none" }}>
            Delete account
          </Button>
        </Group>
      </SettingsCard>
    </Stack>
  );
}
