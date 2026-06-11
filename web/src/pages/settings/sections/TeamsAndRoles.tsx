import { useState } from "react";
import {
  Stack,
  Group,
  Text,
  TextInput,
  Button,
  Box,
  Avatar,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useAuth } from "@/hooks/useAuth";
import { notifications } from "@/utils/customNotifications";

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleDeep: "#3C3489",
  blue: "#378ADD",
  blueLight: "#E6F1FB",
  blueText: "#0C447C",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
  gray: "#B4B2A9",
  grayLight: "#F1EFE8",
  grayText: "#444441",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  amber: "#EF9F27",
  amberLight: "#FAEEDA",
  amberText: "#633806",
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

const ROLE_META: Record<string, { bg: string; text: string; dot: string }> = {
  Manager: { bg: B.purpleLight, text: B.purpleDeep, dot: B.purple },
  Employee: { bg: B.blueLight, text: B.blueText, dot: B.blue },
  Customer: { bg: B.greenLight, text: B.greenText, dot: B.green },
  Agent: { bg: B.amberLight, text: B.amberText, dot: B.amber },
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

const PERMISSIONS: Record<string, { can: string[]; cannot: string[] }> = {
  Manager: {
    can: [
      "Full admin access",
      "Manage all tickets",
      "View analytics",
      "Manage users and teams",
      "Configure system settings",
    ],
    cannot: [],
  },
  Employee: {
    can: [
      "View and resolve assigned tickets",
      "Add comments and attachments",
      "Update ticket status",
    ],
    cannot: [
      "Access admin settings",
      "View other users' tickets",
      "Manage users",
    ],
  },
  Customer: {
    can: ["Create support tickets", "View own tickets", "Add comments"],
    cannot: ["Access admin settings", "View other users' data"],
  },
};

export default function TeamsAndRoles() {
  const { user } = useAuth();
  const [teamMembers] = useState([
    {
      id: "1",
      name: user?.username || "User",
      email: `${user?.username?.toLowerCase()}@company.com`,
      role: user?.role === "MANAGER" ? "Manager" : "Employee",
    },
    {
      id: "2",
      name: "Sara Ahmed",
      email: "sara.ahmed@company.com",
      role: "Manager",
    },
    {
      id: "3",
      name: "Karim Mostafa",
      email: "karim@company.com",
      role: "Employee",
    },
    {
      id: "4",
      name: "Layla Nour",
      email: "layla@company.com",
      role: "Employee",
    },
  ]);
  const [customRole, setCustomRole] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("Manager");

  const handleCreateRole = () => {
    if (!customRole.trim()) {
      notifications.show({
        title: "Error",
        message: "Role name is required",
        color: "red",
      });
      return;
    }
    notifications.show({
      title: "Role created",
      message: `"${customRole}" role has been created`,
      color: "green",
    });
    setCustomRole("");
  };

  return (
    <Stack gap={12}>
      {/* Team members */}
      <SettingsCard
        icon="solar:users-group-rounded-bold-duotone"
        label="Team members"
        description="Current members and their assigned roles"
      >
        <Stack gap={6}>
          {teamMembers.map((m) => {
            const pal = getAvatarPal(m.name);
            const meta = ROLE_META[m.role] ?? ROLE_META.Employee;
            return (
              <Group
                key={m.id}
                justify="space-between"
                align="center"
                px="sm"
                py="sm"
                style={{
                  borderRadius: 8,
                  border: "0.5px solid var(--mantine-color-default-border)",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "var(--mantine-color-default-hover)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "transparent")
                }
              >
                <Group gap={10} wrap="nowrap">
                  <Avatar
                    size={30}
                    radius="xl"
                    style={{
                      ...pal,
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(m.name)}
                  </Avatar>
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {m.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {m.email}
                    </Text>
                  </Box>
                </Group>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 9px",
                    borderRadius: 20,
                    background: meta.bg,
                    color: meta.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: meta.dot,
                    }}
                  />
                  {m.role}
                </span>
              </Group>
            );
          })}
        </Stack>
      </SettingsCard>

      {/* Role permissions browser */}
      <SettingsCard
        icon="solar:shield-check-bold-duotone"
        label="Role permissions"
        description="What each role can and cannot do"
      >
        {/* Role selector pills */}
        <Group gap={6} mb="md">
          {Object.keys(PERMISSIONS).map((r) => {
            const meta = ROLE_META[r] ?? ROLE_META.Employee;
            const active = selectedRole === r;
            return (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: active
                    ? `1.5px solid ${meta.dot}`
                    : "1.5px solid var(--mantine-color-default-border)",
                  background: active ? meta.bg : "transparent",
                  color: active ? meta.text : "var(--mantine-color-dimmed)",
                  cursor: "pointer",
                  transition: "all .13s",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: meta.dot,
                  }}
                />
                {r}
              </button>
            );
          })}
        </Group>

        <Box
          p="md"
          style={{
            borderRadius: 8,
            background: "var(--mantine-color-default-hover)",
            border: "0.5px solid var(--mantine-color-default-border)",
          }}
        >
          <Text size="xs" fw={600} mb="sm" style={{ color: B.green }}>
            Can do
          </Text>
          <Stack gap={4} mb="md">
            {PERMISSIONS[selectedRole].can.map((p, i) => (
              <Group key={i} gap={6}>
                <Icon
                  icon="solar:check-circle-linear"
                  width={13}
                  style={{ color: B.green, flexShrink: 0 }}
                />
                <Text size="xs">{p}</Text>
              </Group>
            ))}
          </Stack>
          {PERMISSIONS[selectedRole].cannot.length > 0 && (
            <>
              <Text size="xs" fw={600} mb="sm" style={{ color: B.red }}>
                Cannot do
              </Text>
              <Stack gap={4}>
                {PERMISSIONS[selectedRole].cannot.map((p, i) => (
                  <Group key={i} gap={6}>
                    <Icon
                      icon="solar:close-circle-linear"
                      width={13}
                      style={{ color: B.red, flexShrink: 0 }}
                    />
                    <Text size="xs">{p}</Text>
                  </Group>
                ))}
              </Stack>
            </>
          )}
        </Box>
      </SettingsCard>

      {/* Create custom role */}
      {user?.role === "MANAGER" && (
        <SettingsCard
          icon="solar:settings-bold-duotone"
          label="Custom roles"
          description="Define roles beyond the defaults"
        >
          <Group gap={8}>
            <TextInput
              placeholder="e.g. Supervisor, QA Lead…"
              value={customRole}
              onChange={(e) => setCustomRole(e.currentTarget.value)}
              style={{ flex: 1 }}
              leftSection={
                <Icon
                  icon="solar:tag-linear"
                  width={14}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
              }
              styles={{ input: { fontSize: 13 } }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateRole();
              }}
            />
            <Button
              size="sm"
              style={{
                background: B.purpleDark,
                border: "none",
                flexShrink: 0,
              }}
              onClick={handleCreateRole}
              disabled={!customRole.trim()}
            >
              Create role
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mt={6}>
            Custom roles can be assigned to team members in Team Management.
          </Text>
        </SettingsCard>
      )}
    </Stack>
  );
}
