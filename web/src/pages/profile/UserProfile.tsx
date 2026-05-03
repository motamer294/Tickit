import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  SimpleGrid,
  Badge,
  Skeleton,
  Alert,
  Divider,
  ActionIcon,
  Modal,
  PasswordInput,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMantineColorScheme } from "@mantine/core";
import type { ChangePasswordPayload } from "../../api/user.api";
import {
  fetchUserProfile,
  fetchUserStats,
  changeUserPassword,
} from "../../api/user.api";
import { useAuthStore } from "../../store/auth.store";
import EditProfileModal from "./EditProfileModal";
import { notifications } from "@mantine/notifications";

const ROLE_COLORS: Record<string, string> = {
  MANAGER: "blue",
  EMPLOYEE: "violet",
  CUSTOMER: "cyan",
};

export function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Fetch user profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
    retry: 2,
  });

  // Fetch user stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["userStats"],
    queryFn: fetchUserStats,
    retry: 2,
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordPayload) => changeUserPassword(data),
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Password changed successfully",
        color: "teal",
        icon: <Icon icon="solar:check-circle-bold-duotone" width="16" />,
      });
      setPasswordModalOpen(false);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: error?.message || "Failed to change password",
        color: "red",
        icon: <Icon icon="solar:warning-circle-bold-duotone" width="16" />,
      });
    },
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
        icon: <Icon icon="solar:warning-circle-bold-duotone" width="16" />,
      });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      notifications.show({
        title: "Error",
        message: "Password must be at least 6 characters",
        color: "red",
        icon: <Icon icon="solar:warning-circle-bold-duotone" width="16" />,
      });
      return;
    }

    changePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
      confirm_password: passwordForm.confirm_password,
    });
  };

  const isLoading = profileLoading || statsLoading;
  const error = profileError || statsError;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xl" fw={600}>
              My Profile
            </Text>
            <Text size="sm" c="dimmed">
              Manage your account settings and preferences
            </Text>
          </div>
          <Button
            leftSection={<Icon icon="solar:logout-3-bold-duotone" width="16" />}
            color="red"
            variant="light"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Group>

        {error && (
          <Alert icon={<Icon icon="solar:warning-circle-bold-duotone" width="16" />} color="red">
            Failed to load profile. Please refresh the page.
          </Alert>
        )}

        {/* Profile Information Card */}
        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">
              Profile Information
            </Text>
            <ActionIcon
              variant="light"
              onClick={() => setEditModalOpen(true)}
              disabled={isLoading}
            >
              <Icon icon="solar:pen-bold-duotone" width="16" />
            </ActionIcon>
          </Group>

          {isLoading ? (
            <Stack gap="md">
              <Skeleton height={20} width="30%" />
              <Skeleton height={20} width="40%" />
              <Skeleton height={20} width="35%" />
            </Stack>
          ) : profile ? (
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    Name
                  </Text>
                  <Text fw={500}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                </div>
                <Badge
                  color={ROLE_COLORS[profile.role] || "gray"}
                  variant="light"
                >
                  {profile.role}
                </Badge>
              </Group>

              <Divider />

              <div>
                <Text size="sm" c="dimmed">
                  Email
                </Text>
                <Text fw={500}>{profile.email}</Text>
              </div>

              <Divider />

              <Group grow>
                <div>
                  <Text size="sm" c="dimmed">
                    Username
                  </Text>
                  <Text fw={500}>{profile.username}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    Member Since
                  </Text>
                  <Text fw={500}>
                    {new Date(profile.date_joined).toLocaleDateString()}
                  </Text>
                </div>
              </Group>

              <Divider />

              <Button
                leftSection={<Icon icon="solar:lock-bold-duotone" width="16" />}
                variant="light"
                onClick={() => setPasswordModalOpen(true)}
              >
                Change Password
              </Button>
            </Stack>
          ) : null}
        </Paper>

        {/* Statistics Card */}
        {(profile?.role === "MANAGER" ||
          profile?.role === "EMPLOYEE" ||
          profile?.role === "CUSTOMER") && (
          <Paper withBorder p="lg" radius="md">
            <Text fw={600} size="lg" mb="lg">
              Your Statistics
            </Text>

            {isLoading ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} height={80} />
                ))}
              </SimpleGrid>
            ) : stats ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <Paper bg={isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(74, 144, 226, 0.05)'} p="md" radius="md" withBorder>
                  <Text size="sm" c="dimmed" fw={500}>
                    Total Tickets
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stats.total_tickets}
                  </Text>
                </Paper>

                <Paper bg={isDark ? 'rgba(105, 219, 124, 0.1)' : 'rgba(105, 219, 124, 0.05)'} p="md" radius="md" withBorder>
                  <Text size="sm" c="dimmed" fw={500}>
                    Open Tickets
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stats.tickets_open}
                  </Text>
                </Paper>

                <Paper bg={isDark ? 'rgba(255, 183, 77, 0.1)' : 'rgba(255, 183, 77, 0.05)'} p="md" radius="md" withBorder>
                  <Text size="sm" c="dimmed" fw={500}>
                    In Progress
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stats.tickets_in_progress}
                  </Text>
                </Paper>

                <Paper bg={isDark ? 'rgba(32, 201, 180, 0.1)' : 'rgba(32, 201, 180, 0.05)'} p="md" radius="md" withBorder>
                  <Text size="sm" c="dimmed" fw={500}>
                    Resolved Tickets
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stats.tickets_resolved}
                  </Text>
                </Paper>

                <Paper bg={isDark ? 'rgba(145, 151, 247, 0.1)' : 'rgba(145, 151, 247, 0.05)'} p="md" radius="md" withBorder>
                  <Text size="sm" c="dimmed" fw={500}>
                    Avg Resolution Time
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stats.avg_resolution_time_hours.toFixed(1)}h
                  </Text>
                </Paper>

                <Paper bg={isDark ? 'rgba(186, 85, 211, 0.1)' : 'rgba(186, 85, 211, 0.05)'} p="md" radius="md" withBorder>
                  <Text size="sm" c="dimmed" fw={500}>
                    Member Since
                  </Text>
                  <Text size="xl" fw={700} mt="xs">
                    {stats.member_since_days}d
                  </Text>
                </Paper>
              </SimpleGrid>
            ) : null}
          </Paper>
        )}
      </Stack>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
          queryClient.invalidateQueries({ queryKey: ["userStats"] });
        }}
      />

      {/* Change Password Modal */}
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
        title="Change Password"
        centered
      >
        <Stack gap="md">
          <PasswordInput
            label="Current Password"
            placeholder="Enter current password"
            value={passwordForm.current_password}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                current_password: e.currentTarget.value,
              })
            }
            disabled={changePasswordMutation.isPending}
          />

          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            value={passwordForm.new_password}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                new_password: e.currentTarget.value,
              })
            }
            disabled={changePasswordMutation.isPending}
            description="At least 6 characters"
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            value={passwordForm.confirm_password}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                confirm_password: e.currentTarget.value,
              })
            }
            disabled={changePasswordMutation.isPending}
          />

          <Group justify="flex-end" mt="xl">
            <Button
              variant="light"
              onClick={() => {
                setPasswordModalOpen(false);
                setPasswordForm({
                  current_password: "",
                  new_password: "",
                  confirm_password: "",
                });
              }}
              disabled={changePasswordMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              loading={changePasswordMutation.isPending}
            >
              Change Password
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
