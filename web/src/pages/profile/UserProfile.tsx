import {
  Container,
  Stack,
  Group,
  Text,
  Button,
  SimpleGrid,
  Skeleton,
  ActionIcon,
  Modal,
  PasswordInput,
  FileInput,
  Box,
  Divider,
  Tooltip,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ChangePasswordPayload } from "../../api/user.api";
import {
  fetchUserProfile,
  fetchUserStats,
  changeUserPassword,
  uploadUserAvatar,
  deleteUserAvatar,
} from "../../api/user.api";
import { useAuthStore } from "../../store/auth.store";
import EditProfileModal from "./EditProfileModal";
import { notifications } from "@/utils/customNotifications";
import UserAvatar from "@/components/UserAvatar";

// ─── Brand palette ─────────────────────────────────────────────────────────────

const B = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleDeep: "#3C3489",
  purpleLight: "#EEEDFE",
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

const ROLE_META: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  MANAGER: {
    bg: B.purpleLight,
    text: B.purpleDeep,
    dot: B.purple,
    label: "Manager",
  },
  EMPLOYEE: {
    bg: B.blueLight,
    text: B.blueText,
    dot: B.blue,
    label: "Employee",
  },
  CUSTOMER: {
    bg: B.greenLight,
    text: B.greenText,
    dot: B.green,
    label: "Customer",
  },
};

// ─── Stat card data ────────────────────────────────────────────────────────────

function getStatCards(stats: any) {
  return [
    {
      label: "Total tickets",
      value: stats.total_tickets,
      icon: "solar:chart-2-linear",
      accentColor: B.purple,
    },
    {
      label: "Open",
      value: stats.tickets_open,
      icon: "solar:bell-linear",
      accentColor: B.red,
    },
    {
      label: "In progress",
      value: stats.tickets_in_progress,
      icon: "solar:hourglass-linear",
      accentColor: B.amber,
    },
    {
      label: "Resolved",
      value: stats.tickets_resolved,
      icon: "solar:check-circle-linear",
      accentColor: B.green,
    },
    {
      label: "Avg resolution",
      value: `${stats.avg_resolution_time_hours.toFixed(1)}h`,
      icon: "solar:clock-linear",
      accentColor: B.blue,
    },
    {
      label: "Member for",
      value: `${stats.member_since_days}d`,
      icon: "solar:calendar-linear",
      accentColor: B.gray,
    },
  ];
}

// ─── Sub-components ────────────────────────────────────────────────────────────

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        background: "var(--mantine-color-body)",
        border: "0.5px solid var(--mantine-color-default-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}

function CardHeader({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Box
      px="lg"
      py="sm"
      style={{
        borderBottom: "0.5px solid var(--mantine-color-default-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Group gap={8}>{left}</Group>
      {right}
    </Box>
  );
}

function StatCard({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string;
  value: string | number;
  icon: string;
  accentColor: string;
}) {
  return (
    <Box
      p="md"
      style={{
        background: "var(--mantine-color-body)",
        border: "0.5px solid var(--mantine-color-default-border)",
        borderRadius: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Group justify="space-between" mb={8}>
        <Text
          size="xs"
          c="dimmed"
          fw={500}
          tt="uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        <Icon
          icon={icon}
          width={14}
          style={{ color: accentColor, opacity: 0.75 }}
        />
      </Group>
      <Text fw={500} style={{ fontSize: 26, lineHeight: 1 }}>
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
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Text
        size="xs"
        c="dimmed"
        fw={500}
        tt="uppercase"
        style={{ letterSpacing: "0.05em", marginBottom: 3 }}
      >
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Box>
  );
}

const mStyles = {
  header: {
    borderBottom: "0.5px solid var(--mantine-color-default-border)",
    paddingBottom: 12,
  },
  body: { paddingTop: 16 },
};

// ─── Main Component ────────────────────────────────────────────────────────────

export function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
    retry: 2,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats"],
    queryFn: fetchUserStats,
    retry: 2,
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => uploadUserAvatar(file),
    onSuccess: () => {
      notifications.show({
        title: "Profile picture updated",
        message: "Your new avatar has been saved",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error: any) =>
      notifications.show({
        title: "Error",
        message: error?.message || "Failed to upload avatar",
        color: "red",
      }),
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: () => deleteUserAvatar(),
    onSuccess: () => {
      notifications.show({
        title: "Profile picture removed",
        message: "Your avatar has been removed",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error: any) =>
      notifications.show({
        title: "Error",
        message: error?.message || "Failed to remove avatar",
        color: "red",
      }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordPayload) => changeUserPassword(data),
    onSuccess: () => {
      notifications.show({
        title: "Password changed",
        message: "Your password has been updated",
        color: "green",
      });
      setPasswordModalOpen(false);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    },
    onError: (error: any) =>
      notifications.show({
        title: "Error",
        message: error?.message || "Failed to change password",
        color: "red",
      }),
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChangePassword = () => {
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
    changePasswordMutation.mutate(passwordForm);
  };

  const isLoading = profileLoading || statsLoading;
  const roleMeta = profile
    ? (ROLE_META[profile.role] ?? ROLE_META.CUSTOMER)
    : null;

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        {/* ── Header ── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>
              My Profile
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Manage your account settings and preferences
            </Text>
          </Box>
          <Button
            size="sm"
            variant="default"
            leftSection={
              <Icon
                icon="solar:logout-3-bold-duotone"
                width={15}
                style={{ color: B.red }}
              />
            }
            onClick={handleLogout}
            style={{ color: B.red, borderColor: `${B.red}44` }}
          >
            Log out
          </Button>
        </Group>

        {/* ── Error ── */}
        {profileError && (
          <Box
            p="md"
            style={{
              borderRadius: 10,
              background: B.redLight,
              border: `0.5px solid ${B.red}33`,
            }}
          >
            <Group gap={8}>
              <Icon
                icon="solar:danger-triangle-linear"
                width={14}
                style={{ color: B.red }}
              />
              <Text size="sm" style={{ color: B.redText }}>
                Failed to load profile. Please refresh the page.
              </Text>
            </Group>
          </Box>
        )}

        {/* ── Profile card ── */}
        <Card>
          <CardHeader
            left={
              <>
                <Icon
                  icon="solar:user-bold-duotone"
                  width={15}
                  style={{ color: B.purple }}
                />
                <SLabel>Profile information</SLabel>
              </>
            }
            right={
              <Tooltip label="Edit profile" withArrow fz={11}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  style={{ color: B.purpleDark }}
                  disabled={isLoading}
                  onClick={() => setEditModalOpen(true)}
                >
                  <Icon icon="solar:pen-2-linear" width={15} />
                </ActionIcon>
              </Tooltip>
            }
          />

          {isLoading ? (
            <Box p="lg">
              <Stack gap="md">
                <Group gap={16}>
                  <Skeleton circle height={64} />
                  <Stack gap={6} style={{ flex: 1 }}>
                    <Skeleton height={16} width="40%" />
                    <Skeleton height={12} width="28%" />
                  </Stack>
                </Group>
                <Divider />
                <SimpleGrid cols={2} spacing="md">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </SimpleGrid>
              </Stack>
            </Box>
          ) : profile ? (
            <>
              {/* Avatar + name row */}
              <Box
                px="lg"
                py="lg"
                style={{
                  borderBottom:
                    "0.5px solid var(--mantine-color-default-border)",
                }}
              >
                <Group gap={16}>
                  <UserAvatar
                    userId={profile.id}
                    firstName={profile.first_name}
                    lastName={profile.last_name}
                    name={profile.username}
                    size={60}
                    radius="xl"
                    style={{ fontSize: 18, fontWeight: 700, flexShrink: 0 }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={10} align="center" mb={4}>
                      <Text fw={600} style={{ fontSize: 17 }}>
                        {profile.first_name} {profile.last_name}
                      </Text>
                      {roleMeta && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "3px 9px",
                            borderRadius: 20,
                            background: roleMeta.bg,
                            color: roleMeta.text,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: roleMeta.dot,
                            }}
                          />
                          {roleMeta.label}
                        </span>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed">
                      @{profile.username}
                    </Text>
                  </Box>
                </Group>
              </Box>

              {/* Details grid */}
              <Box px="lg" py="md">
                <SimpleGrid cols={2} spacing="md" mb="md">
                  <InfoRow label="Email" value={profile.email} />
                  <InfoRow label="Username" value={`@${profile.username}`} />
                  <InfoRow
                    label="Member since"
                    value={new Date(profile.date_joined).toLocaleDateString(
                      undefined,
                      { month: "long", year: "numeric" },
                    )}
                  />
                  <InfoRow
                    label="Role"
                    value={roleMeta?.label ?? profile.role}
                  />
                </SimpleGrid>

                <Divider mb="md" />

                <Stack gap="sm">
                  {/* Profile picture */}
                  <Group
                    justify="space-between"
                    align="center"
                    px="sm"
                    py="sm"
                    style={{
                      borderRadius: 8,
                      background: "var(--mantine-color-default-hover)",
                      border:
                        "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group gap={8}>
                      <Icon
                        icon="solar:camera-bold-duotone"
                        width={15}
                        style={{ color: "var(--mantine-color-dimmed)" }}
                      />
                      <Box>
                        <Text size="sm" fw={500}>
                          Profile picture
                        </Text>
                        <Text size="xs" c="dimmed">
                          JPG, PNG or WebP · Max 2 MB
                        </Text>
                      </Box>
                    </Group>
                    <Group gap={6}>
                      <FileInput
                        placeholder="Choose an image…"
                        accept="image/*"
                        value={null}
                        w={200}
                        disabled={uploadAvatarMutation.isPending}
                        onChange={(file) => {
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            notifications.show({
                              title: "Error",
                              message: "Image must be 2MB or smaller",
                              color: "red",
                            });
                            return;
                          }
                          uploadAvatarMutation.mutate(file);
                        }}
                        leftSection={
                          <Icon
                            icon="solar:upload-bold-duotone"
                            width={14}
                            style={{ color: "var(--mantine-color-dimmed)" }}
                          />
                        }
                        styles={{ input: { fontSize: 12 } }}
                      />
                      {profile.has_avatar && (
                        <Tooltip label="Remove photo" withArrow fz={11}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            disabled={deleteAvatarMutation.isPending}
                            onClick={() => deleteAvatarMutation.mutate()}
                          >
                            <Icon icon="solar:trash-bin-trash-linear" width={15} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>

                  {/* Security */}
                  <Group
                    justify="space-between"
                    align="center"
                    px="sm"
                    py="sm"
                    style={{
                      borderRadius: 8,
                      background: "var(--mantine-color-default-hover)",
                      border:
                        "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group gap={8}>
                      <Icon
                        icon="solar:lock-bold-duotone"
                        width={15}
                        style={{ color: "var(--mantine-color-dimmed)" }}
                      />
                      <Box>
                        <Text size="sm" fw={500}>
                          Password
                        </Text>
                        <Text size="xs" c="dimmed">
                          Update your account password
                        </Text>
                      </Box>
                    </Group>
                    <Button
                      size="xs"
                      variant="default"
                      onClick={() => setPasswordModalOpen(true)}
                    >
                      Change
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </>
          ) : null}
        </Card>

        {/* ── Stats card ── */}
        {profile && (
          <Card>
            <CardHeader
              left={
                <>
                  <Icon
                    icon="solar:chart-2-bold-duotone"
                    width={15}
                    style={{ color: B.purple }}
                  />
                  <SLabel>Your statistics</SLabel>
                </>
              }
            />
            <Box p="lg">
              {isLoading ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} height={80} radius="md" />
                  ))}
                </SimpleGrid>
              ) : stats ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={10}>
                  {getStatCards(stats).map((card) => (
                    <StatCard key={card.label} {...card} />
                  ))}
                </SimpleGrid>
              ) : null}
            </Box>
          </Card>
        )}
      </Stack>

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
          queryClient.invalidateQueries({ queryKey: ["userStats"] });
        }}
      />

      {/* ── Change Password Modal ── */}
      <Modal
        opened={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPasswordForm({
            current_password: "",
            new_password: "",
            confirm_password: "",
          });
        }}
        title={
          <Group gap={8}>
            <Icon
              icon="solar:lock-bold-duotone"
              width={18}
              style={{ color: B.purple }}
            />
            <Text fw={500} size="sm">
              Change password
            </Text>
          </Group>
        }
        centered
        radius="md"
        styles={mStyles}
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
            disabled={changePasswordMutation.isPending}
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
            disabled={changePasswordMutation.isPending}
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
            disabled={changePasswordMutation.isPending}
            error={
              passwordForm.confirm_password &&
              passwordForm.new_password !== passwordForm.confirm_password
                ? "Passwords do not match"
                : undefined
            }
            styles={{ input: { fontSize: 13 } }}
          />

          <Divider />

          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              disabled={changePasswordMutation.isPending}
              onClick={() => {
                setPasswordModalOpen(false);
                setPasswordForm({
                  current_password: "",
                  new_password: "",
                  confirm_password: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: B.purpleDark, border: "none" }}
              loading={changePasswordMutation.isPending}
              onClick={handleChangePassword}
            >
              Update password
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
