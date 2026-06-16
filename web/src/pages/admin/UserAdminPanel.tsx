import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Button,
  Modal,
  TextInput,
  Select,
  PasswordInput,
  LoadingOverlay,
  Center,
  Skeleton,
  SimpleGrid,
  ActionIcon,
  Tooltip,
  Box,
  Divider,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@/utils/customNotifications";
import {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  type User,
  type UserCreatePayload,
  type UserUpdatePayload,
} from "@/api/admin.api";
import UserAvatar from "@/components/UserAvatar";

// ─── Brand palette (matches Dashboard & TicketsList) ──────────────────────────

const BRAND = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  amber: "#EF9F27",
  amberLight: "#FAEEDA",
  amberText: "#633806",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
  gray: "#B4B2A9",
  grayLight: "#F1EFE8",
  grayText: "#444441",
  blue: "#378ADD",
  blueLight: "#E6F1FB",
  blueText: "#0C447C",
};

// ─── Role / Status metadata ────────────────────────────────────────────────────

const ROLE_META: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    avatarBg: string;
    avatarText: string;
  }
> = {
  MANAGER: {
    label: "Manager",
    bg: BRAND.purpleLight,
    text: BRAND.purpleText,
    dot: BRAND.purple,
    avatarBg: "#EEEDFE",
    avatarText: "#3C3489",
  },
  EMPLOYEE: {
    label: "Employee",
    bg: BRAND.blueLight,
    text: BRAND.blueText,
    dot: BRAND.blue,
    avatarBg: "#E6F1FB",
    avatarText: "#0C447C",
  },
  CUSTOMER: {
    label: "Customer",
    bg: BRAND.greenLight,
    text: BRAND.greenText,
    dot: BRAND.green,
    avatarBg: "#EAF3DE",
    avatarText: "#27500A",
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? {
    label: role,
    bg: BRAND.grayLight,
    text: BRAND.grayText,
    dot: BRAND.gray,
  };
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
        background: m.bg,
        color: m.text,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: m.dot,
          flexShrink: 0,
        }}
      />
      {m.label}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
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
        background: active ? BRAND.greenLight : BRAND.redLight,
        color: active ? BRAND.greenText : BRAND.redText,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: active ? BRAND.green : BRAND.red,
          flexShrink: 0,
        }}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// Quick-filter role pill
function RolePill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        padding: "5px 12px",
        borderRadius: 20,
        border: active
          ? `1.5px solid ${color}`
          : "1.5px solid var(--mantine-color-default-border)",
        background: active ? color + "22" : "transparent",
        color: active ? color : "var(--mantine-color-dimmed)",
        cursor: "pointer",
        transition: "all .15s",
      }}
    >
      {label}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "1px 5px",
          borderRadius: 10,
          background: active
            ? "rgba(0,0,0,0.08)"
            : "var(--mantine-color-default-hover)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string;
  value: number;
  icon: string;
  accentColor: string;
}) {
  return (
    <Paper
      radius="md"
      p="md"
      style={{
        border: "0.5px solid var(--mantine-color-default-border)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Group justify="space-between" mb={8}>
        <Text
          size="xs"
          c="dimmed"
          tt="uppercase"
          fw={500}
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        <Icon
          icon={icon}
          width={15}
          style={{ color: accentColor, opacity: 0.75 }}
        />
      </Group>
      <Text fw={500} style={{ fontSize: 28, lineHeight: 1 }}>
        {value}
      </Text>
      <Box
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accentColor,
        }}
      />
    </Paper>
  );
}

function UserMobileCard({
  user,
  onEdit,
  onDeactivate,
}: {
  user: User;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <Box p="sm" style={{ borderBottom: "0.5px solid var(--mantine-color-default-border)" }}>
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Group gap={8} wrap="nowrap">
          <UserAvatar userId={user.id} firstName={user.first_name} lastName={user.last_name} name={user.username} size={28} radius="xl" style={{ fontSize: 10, fontWeight: 600, flexShrink: 0 }} />
          <Box style={{ minWidth: 0 }}>
            <Text size="sm" fw={500} style={{ lineHeight: 1.3 }}>{user.first_name} {user.last_name}</Text>
            <Text size="xs" c="dimmed">@{user.username}</Text>
          </Box>
        </Group>
        <StatusBadge active={user.is_active} />
      </Group>
      <Text size="xs" c="dimmed" mb={6}>{user.email}</Text>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="wrap">
          <RoleBadge role={user.role} />
          <Text size="xs" c="dimmed">
            {new Date(user.date_joined).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </Group>
        <Group gap={4} wrap="nowrap">
          <ActionIcon variant="subtle" size="sm" style={{ color: BRAND.purpleDark }} onClick={onEdit}>
            <Icon icon="solar:pen-2-linear" width={14} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="sm" style={{ color: user.is_active ? BRAND.red : BRAND.gray }} disabled={!user.is_active} onClick={onDeactivate}>
            <Icon icon="solar:user-block-linear" width={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type FormData = {
  username?: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: "MANAGER" | "EMPLOYEE" | "CUSTOMER";
};

const DEFAULT_FORM: FormData = {
  email: "",
  first_name: "",
  last_name: "",
  role: "EMPLOYEE",
};

export default function UserAdminPanel() {
  const queryClient = useQueryClient();

  const [opened, setOpened] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRole, setActiveRole] = useState<string>("ALL");

  const isMobile = useMediaQuery("(max-width: 640px)");

  // ── Queries ──
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(1000, 0),
  });

  // ── Mutations ──
  const createUserMutation = useMutation({
    mutationFn: (payload: UserCreatePayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      notifications.show({
        title: "User created",
        message: "New user has been created successfully",
        color: "green",
      });
      closeModal();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to create user",
        color: "red",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: number;
      data: UserUpdatePayload;
    }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      notifications.show({
        title: "User updated",
        message: "User has been updated successfully",
        color: "green",
      });
      closeModal();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update user",
        color: "red",
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      notifications.show({
        title: "User deactivated",
        message: "User has been deactivated successfully",
        color: "green",
      });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message:
          err instanceof Error ? err.message : "Failed to deactivate user",
        color: "red",
      });
    },
  });

  // ── Handlers ──
  const openCreate = () => {
    setEditingUser(null);
    setFormData(DEFAULT_FORM);
    setOpened(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    });
    setOpened(true);
  };

  const closeModal = () => {
    setOpened(false);
    setEditingUser(null);
    setFormData(DEFAULT_FORM);
  };

  const handleSubmit = () => {
    if (!formData.email || !formData.first_name || !formData.last_name) {
      notifications.show({
        title: "Validation error",
        message: "Please fill in all required fields",
        color: "yellow",
      });
      return;
    }
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        data: {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
        },
      });
    } else {
      if (!formData.username || !formData.password) {
        notifications.show({
          title: "Validation error",
          message: "Username and password are required",
          color: "yellow",
        });
        return;
      }
      createUserMutation.mutate({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
      });
    }
  };

  const handleDeactivate = (user: User) => {
    if (
      window.confirm(
        `Deactivate ${user.username}? They will lose access immediately.`,
      )
    ) {
      deactivateUserMutation.mutate(user.id);
    }
  };

  // ── Derived data ──
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: users.length };
    ["MANAGER", "EMPLOYEE", "CUSTOMER"].forEach((r) => {
      counts[r] = users.filter((u: User) => u.role === r).length;
    });
    return counts;
  }, [users]);

  const displayUsers = useMemo(() => {
    let list = users;
    if (activeRole !== "ALL")
      list = list.filter((u: User) => u.role === activeRole);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u: User) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, activeRole, searchQuery]);

  const activeCount = users.filter((u: User) => u.is_active).length;
  const inactiveCount = users.length - activeCount;


  const TH_STYLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--mantine-color-dimmed)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    paddingBottom: 10,
    whiteSpace: "nowrap",
  };

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        {/* ── Header ── */}
        <Group justify="space-between" align="flex-end" wrap="wrap" gap={12}>
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>
              User Management
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Create, edit, and manage system users
            </Text>
          </Box>
          <Button
            size="sm"
            leftSection={
              <Icon icon="solar:user-plus-bold-duotone" width={15} />
            }
            style={{ background: BRAND.purpleDark, border: "none" }}
            onClick={openCreate}
          >
            Add user
          </Button>
        </Group>

        {/* ── Stat cards ── */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing={10}>
          <StatCard
            label="Total users"
            value={users.length}
            icon="solar:users-group-two-rounded-linear"
            accentColor={BRAND.purple}
          />
          <StatCard
            label="Active"
            value={activeCount}
            icon="solar:check-circle-linear"
            accentColor={BRAND.green}
          />
          <StatCard
            label="Inactive"
            value={inactiveCount}
            icon="solar:close-circle-linear"
            accentColor={BRAND.red}
          />
          <StatCard
            label="Managers"
            value={roleCounts["MANAGER"] ?? 0}
            icon="solar:shield-user-linear"
            accentColor={BRAND.purple}
          />
          <StatCard
            label="Employees"
            value={roleCounts["EMPLOYEE"] ?? 0}
            icon="solar:user-id-linear"
            accentColor={BRAND.blue}
          />
          <StatCard
            label="Customers"
            value={roleCounts["CUSTOMER"] ?? 0}
            icon="solar:user-circle-linear"
            accentColor={BRAND.green}
          />
        </SimpleGrid>

        {/* ── Error ── */}
        {error && (
          <Paper
            p="md"
            radius="md"
            style={{
              background: BRAND.redLight,
              border: `0.5px solid ${BRAND.red}33`,
            }}
          >
            <Group justify="space-between">
              <Group gap={8}>
                <Icon
                  icon="solar:danger-triangle-linear"
                  width={16}
                  style={{ color: BRAND.red }}
                />
                <Text size="sm" style={{ color: BRAND.redText }}>
                  Error loading users. Please try again.
                </Text>
              </Group>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => window.location.reload()}
              >
                <Icon icon="solar:refresh-linear" width={16} />
              </ActionIcon>
            </Group>
          </Paper>
        )}

        {/* ── Role filter pills + search ── */}
        <Paper
          radius="md"
          p="md"
          style={{ border: "0.5px solid var(--mantine-color-default-border)" }}
        >
          <Group justify="space-between" wrap="wrap" gap={8}>
            {/* Role pills */}
            <Group gap={6} wrap="wrap">
              <RolePill
                label="All"
                count={roleCounts["ALL"] ?? 0}
                active={activeRole === "ALL"}
                color={BRAND.purple}
                onClick={() => setActiveRole("ALL")}
              />
              <RolePill
                label="Manager"
                count={roleCounts["MANAGER"] ?? 0}
                active={activeRole === "MANAGER"}
                color={BRAND.purple}
                onClick={() => setActiveRole("MANAGER")}
              />
              <RolePill
                label="Employee"
                count={roleCounts["EMPLOYEE"] ?? 0}
                active={activeRole === "EMPLOYEE"}
                color={BRAND.blue}
                onClick={() => setActiveRole("EMPLOYEE")}
              />
              <RolePill
                label="Customer"
                count={roleCounts["CUSTOMER"] ?? 0}
                active={activeRole === "CUSTOMER"}
                color={BRAND.green}
                onClick={() => setActiveRole("CUSTOMER")}
              />
            </Group>

            {/* Search */}
            <TextInput
              placeholder="Search by name, username or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={
                <Icon
                  icon="solar:magnifer-linear"
                  width={14}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
              }
              rightSection={
                searchQuery ? (
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    onClick={() => setSearchQuery("")}
                  >
                    <Icon icon="solar:close-circle-linear" width={13} />
                  </ActionIcon>
                ) : null
              }
              style={{ width: 260 }}
              styles={{ input: { fontSize: 13, height: 34 } }}
            />
          </Group>
        </Paper>

        {/* ── Table ── */}
        <Paper
          radius="md"
          style={{
            border: "0.5px solid var(--mantine-color-default-border)",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <Box style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "0.5px solid var(--mantine-color-default-border)" }}>
                      <td style={{ padding: "10px 16px" }}><Skeleton height={28} radius="sm" /></td>
                      <td style={{ padding: "10px 16px" }}><Skeleton height={14} radius="sm" /></td>
                      <td style={{ padding: "10px 16px" }}><Skeleton height={20} width={70} radius="xl" /></td>
                      <td style={{ padding: "10px 16px" }}><Skeleton height={20} width={60} radius="xl" /></td>
                      <td style={{ padding: "10px 16px" }}><Skeleton height={14} radius="sm" /></td>
                      <td style={{ padding: "10px 16px" }}><Skeleton height={28} width={60} radius="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          ) : isMobile ? (
            displayUsers.length > 0 ? (
              <Stack gap={0}>
                {displayUsers.map((user: User) => {
                  return (
                    <UserMobileCard
                      key={user.id}
                      user={user}
                      onEdit={() => openEdit(user)}
                      onDeactivate={() => handleDeactivate(user)}
                    />
                  );
                })}
              </Stack>
            ) : (
              <Center py={80}>
                <Stack align="center" gap="sm">
                  <Icon icon="solar:users-group-two-rounded-linear" width={36} style={{ color: "var(--mantine-color-dimmed)", opacity: 0.4 }} />
                  <Text size="sm" c="dimmed">No users found</Text>
                  {(searchQuery || activeRole !== "ALL") && (
                    <Button variant="subtle" size="xs" style={{ color: BRAND.purpleDark }} onClick={() => { setSearchQuery(""); setActiveRole("ALL"); }}>
                      Clear filters
                    </Button>
                  )}
                </Stack>
              </Center>
            )
          ) : (
            <Box style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom:
                        "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>User</th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>Email</th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>Role</th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>Status</th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}>Joined</th>
                    <th style={{ ...TH_STYLE, padding: "10px 16px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayUsers.length > 0 ? (
                  displayUsers.map((user: User, idx: number) => {
                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom:
                            idx < displayUsers.length - 1
                              ? "0.5px solid var(--mantine-color-default-border)"
                              : "none",
                          transition: "background .12s",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.background =
                            "var(--mantine-color-default-hover)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.background = "transparent";
                        }}
                      >
                        {/* User (avatar + name + username) */}
                        <td style={{ padding: "10px 16px" }}>
                          <Group gap={10} wrap="nowrap">
                            <UserAvatar
                              userId={user.id}
                              firstName={user.first_name}
                              lastName={user.last_name}
                              name={user.username}
                              size={32}
                              radius="xl"
                              style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}
                            />
                            <Box style={{ minWidth: 0 }}>
                              <Text
                                size="sm"
                                fw={500}
                                style={{ lineHeight: 1.3 }}
                              >
                                {user.first_name} {user.last_name}
                              </Text>
                              <Text
                                size="xs"
                                c="dimmed"
                                style={{ lineHeight: 1.2 }}
                              >
                                @{user.username}
                              </Text>
                            </Box>
                          </Group>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "10px 16px" }}>
                          <Text size="sm" c="dimmed">
                            {user.email}
                          </Text>
                        </td>

                        {/* Role */}
                        <td style={{ padding: "10px 16px" }}>
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Status */}
                        <td style={{ padding: "10px 16px" }}>
                          <StatusBadge active={user.is_active} />
                        </td>

                        {/* Joined */}
                        <td
                          style={{ padding: "10px 16px", whiteSpace: "nowrap" }}
                        >
                          <Text size="xs" c="dimmed">
                            {new Date(user.date_joined).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </Text>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "10px 16px" }}>
                          <Group gap={4} wrap="nowrap" justify="flex-end">
                            <Tooltip
                              label="Edit user"
                              withArrow
                              fz={11}
                              position="top"
                            >
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                style={{ color: BRAND.purpleDark }}
                                onClick={() => openEdit(user)}
                              >
                                <Icon icon="solar:pen-2-linear" width={15} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip
                              label={
                                user.is_active
                                  ? "Deactivate user"
                                  : "Already inactive"
                              }
                              withArrow
                              fz={11}
                              position="top"
                            >
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                style={{
                                  color: user.is_active
                                    ? BRAND.red
                                    : BRAND.gray,
                                }}
                                disabled={!user.is_active}
                                onClick={() => handleDeactivate(user)}
                              >
                                <Icon
                                  icon="solar:user-block-linear"
                                  width={15}
                                />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <Center py={80}>
                        <Stack align="center" gap="sm">
                          <Icon
                            icon="solar:users-group-two-rounded-linear"
                            width={36}
                            style={{
                              color: "var(--mantine-color-dimmed)",
                              opacity: 0.4,
                            }}
                          />
                          <Text size="sm" c="dimmed">
                            No users found
                          </Text>
                          {(searchQuery || activeRole !== "ALL") && (
                            <Button
                              variant="subtle"
                              size="xs"
                              style={{ color: BRAND.purpleDark }}
                              onClick={() => {
                                setSearchQuery("");
                                setActiveRole("ALL");
                              }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </Stack>
                      </Center>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
          )}

          {/* Table footer */}
          <Box
            px="md"
            py="sm"
            style={{
              borderTop: "0.5px solid var(--mantine-color-default-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text size="xs" c="dimmed">
              Showing{" "}
              <span
                style={{ fontWeight: 500, color: "var(--mantine-color-text)" }}
              >
                {displayUsers.length}
              </span>{" "}
              of{" "}
              <span
                style={{ fontWeight: 500, color: "var(--mantine-color-text)" }}
              >
                {users.length}
              </span>{" "}
              users
              {(searchQuery || activeRole !== "ALL") && " · filtered"}
            </Text>
            {(searchQuery || activeRole !== "ALL") && (
              <Button
                variant="subtle"
                size="xs"
                style={{
                  color: BRAND.purpleDark,
                  padding: "0 4px",
                  height: "auto",
                }}
                leftSection={
                  <Icon icon="solar:close-circle-linear" width={12} />
                }
                onClick={() => {
                  setSearchQuery("");
                  setActiveRole("ALL");
                }}
              >
                Clear filters
              </Button>
            )}
          </Box>
        </Paper>
      </Stack>

      {/* ── User Form Modal ── */}
      <Modal
        opened={opened}
        onClose={closeModal}
        title={
          <Group gap={8}>
            <Icon
              icon={
                editingUser
                  ? "solar:pen-2-bold-duotone"
                  : "solar:user-plus-bold-duotone"
              }
              width={18}
              style={{ color: BRAND.purple }}
            />
            <Text fw={500} size="sm">
              {editingUser ? "Edit user" : "Create new user"}
            </Text>
          </Group>
        }
        size="md"
        radius="md"
        styles={{
          header: {
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
            paddingBottom: 12,
          },
          body: { paddingTop: 16 },
        }}
      >
        <LoadingOverlay
          visible={createUserMutation.isPending || updateUserMutation.isPending}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />

        <Stack gap="md">
          {/* Username (create only) */}
          {!editingUser && (
            <TextInput
              label="Username"
              placeholder="e.g. john_doe"
              required
              value={formData.username ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              styles={{
                label: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
              }}
            />
          )}

          {/* Email */}
          <TextInput
            label="Email address"
            placeholder="user@company.com"
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            styles={{
              label: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
            }}
          />

          {/* Name row */}
          <Group grow gap={12}>
            <TextInput
              label="First name"
              placeholder="John"
              required
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              styles={{
                label: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
              }}
            />
            <TextInput
              label="Last name"
              placeholder="Doe"
              required
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              styles={{
                label: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
              }}
            />
          </Group>

          {/* Role */}
          <Select
            label="Role"
            placeholder="Select a role"
            data={[
              { value: "MANAGER", label: "Manager" },
              { value: "EMPLOYEE", label: "Employee" },
              { value: "CUSTOMER", label: "Customer" },
            ]}
            value={formData.role}
            onChange={(value) =>
              setFormData({
                ...formData,
                role: (value as FormData["role"]) ?? "EMPLOYEE",
              })
            }
            styles={{
              label: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
            }}
          />

          {/* Password (create only) */}
          {!editingUser && (
            <PasswordInput
              label="Password"
              placeholder="Min. 8 characters"
              required
              value={formData.password ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              styles={{
                label: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
              }}
            />
          )}

          <Divider mt={4} />

          {/* Actions */}
          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: BRAND.purpleDark, border: "none" }}
              onClick={handleSubmit}
              loading={
                createUserMutation.isPending || updateUserMutation.isPending
              }
            >
              {editingUser ? "Save changes" : "Create user"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
