/**
 * Team Member Manager Component
 * Component for managing team members (add/remove)
 */

import { useState } from "react";
import {
  Stack,
  Group,
  Button,
  Select,
  ActionIcon,
  Text,
  Box,
  Tooltip,
  LoadingOverlay,
  Center,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { notifications } from "@/utils/customNotifications";
import type { Team, User } from "@/api/departments.api";
import UserAvatar from "@/components/UserAvatar";

// ─── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  purple: "#7F77DD",
  purpleDark: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText: "#3C3489",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redText: "#791F1F",
  green: "#639922",
  greenLight: "#EAF3DE",
  greenText: "#27500A",
};

function displayName(user: User) {
  return user.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user.username;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TeamMemberManagerProps {
  team: Team;
  allEmployees: User[];
  onAddMember: (userId: number) => Promise<void>;
  onRemoveMember: (userId: number) => Promise<void>;
  isLoading?: boolean;
}

const TH_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--mantine-color-dimmed)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  paddingBottom: 8,
  whiteSpace: "nowrap",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function TeamMemberManager({
  team,
  allEmployees,
  onAddMember,
  onRemoveMember,
  isLoading = false,
}: TeamMemberManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const members = team.members || [];
  const memberIds = new Set(members.map((m) => m.id));
  const available = allEmployees.filter((e) => !memberIds.has(e.id));

  const selectedEmployee = selectedId
    ? available.find((e) => e.id.toString() === selectedId)
    : null;

  const handleAdd = async () => {
    if (!selectedId) return;
    setIsAdding(true);
    try {
      await onAddMember(parseInt(selectedId, 10));
      setSelectedId(null);
      notifications.show({
        title: "Member added",
        message: "Employee added to team successfully",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to add member",
        color: "red",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (memberId: number) => {
    setRemovingId(memberId);
    try {
      await onRemoveMember(memberId);
      notifications.show({
        title: "Member removed",
        message: "Employee removed from team",
        color: "green",
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to remove member",
        color: "red",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay
        visible={isLoading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />

      {/* ── Add member ── */}
      <Box
        p="md"
        style={{
          borderRadius: "var(--mantine-radius-md)",
          border: "0.5px solid var(--mantine-color-default-border)",
        }}
      >
        <Text
          size="xs"
          tt="uppercase"
          fw={500}
          c="dimmed"
          mb="sm"
          style={{ letterSpacing: "0.05em" }}
        >
          Add member
        </Text>

        <Group gap={8} wrap="nowrap" align="flex-start">
          <Select
            placeholder={
              available.length === 0
                ? "All employees already in team"
                : "Search employees…"
            }
            data={available.map((e) => ({
              value: e.id.toString(),
              label: displayName(e),
            }))}
            value={selectedId}
            onChange={setSelectedId}
            searchable
            clearable
            disabled={isAdding || available.length === 0}
            style={{ flex: 1 }}
            leftSection={
              <Icon
                icon="solar:user-plus-linear"
                width={14}
                style={{ color: "var(--mantine-color-dimmed)" }}
              />
            }
            styles={{ input: { fontSize: 13 } }}
          />
          <Button
            size="sm"
            style={{
              background: selectedId ? BRAND.purpleDark : undefined,
              border: "none",
              flexShrink: 0,
            }}
            onClick={handleAdd}
            loading={isAdding}
            disabled={!selectedId || isAdding || available.length === 0}
          >
            Add
          </Button>
        </Group>

        {/* Selected employee preview */}
        {selectedEmployee && (
          <Group
            gap={8}
            mt={10}
            px="sm"
            py={7}
            style={{
              borderRadius: 8,
              background: BRAND.purpleLight,
              border: `0.5px solid ${BRAND.purple}33`,
            }}
          >
            <UserAvatar
              userId={selectedEmployee.id}
              name={displayName(selectedEmployee)}
              size={22}
              radius="xl"
              style={{ fontSize: 8, fontWeight: 700, flexShrink: 0 }}
            />
            <Text size="xs" fw={500} style={{ color: BRAND.purpleText }}>
              {displayName(selectedEmployee)}
            </Text>
            {selectedEmployee.email && (
              <Text size="xs" c="dimmed" style={{ marginLeft: "auto" }}>
                {selectedEmployee.email}
              </Text>
            )}
          </Group>
        )}

        {available.length === 0 && (
          <Group gap={6} mt={8}>
            <Icon
              icon="solar:check-circle-linear"
              width={13}
              style={{ color: BRAND.green }}
            />
            <Text size="xs" style={{ color: BRAND.greenText }}>
              All available employees are already on this team
            </Text>
          </Group>
        )}
      </Box>

      {/* ── Members list ── */}
      <Box
        style={{
          borderRadius: "var(--mantine-radius-md)",
          border: "0.5px solid var(--mantine-color-default-border)",
          overflow: "hidden",
        }}
      >
        {/* Sub-header */}
        <Box
          px="md"
          py="sm"
          style={{
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
          }}
        >
          <Group justify="space-between" align="center">
            <Text
              size="xs"
              tt="uppercase"
              fw={500}
              c="dimmed"
              style={{ letterSpacing: "0.05em" }}
            >
              Current members
            </Text>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 20,
                background: BRAND.purpleLight,
                color: BRAND.purpleText,
              }}
            >
              {members.length}
            </span>
          </Group>
        </Box>

        {members.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="sm">
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: BRAND.purpleLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  icon="solar:users-group-two-rounded-linear"
                  width={18}
                  style={{ color: BRAND.purple }}
                />
              </Box>
              <Text size="sm" c="dimmed" fw={500}>
                No members yet
              </Text>
              <Text size="xs" c="dimmed" style={{ opacity: 0.6 }}>
                Add employees using the form above
              </Text>
            </Stack>
          </Center>
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
                  <th style={{ ...TH_STYLE, padding: "8px 16px" }}>Member</th>
                  <th style={{ ...TH_STYLE, padding: "8px 16px" }}>Username</th>
                  <th style={{ ...TH_STYLE, padding: "8px 16px" }}>Email</th>
                  <th style={{ ...TH_STYLE, padding: "8px 16px" }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => {
                  const name = displayName(member);
                  return (
                    <tr
                      key={member.id}
                      style={{
                        borderBottom:
                          idx < members.length - 1
                            ? "0.5px solid var(--mantine-color-default-border)"
                            : "none",
                        transition: "background .12s",
                        opacity: removingId === member.id ? 0.5 : 1,
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
                      {/* Name + avatar */}
                      <td style={{ padding: "9px 16px" }}>
                        <Group gap={10} wrap="nowrap">
                          <UserAvatar
                            userId={member.id}
                            name={name}
                            size={28}
                            radius="xl"
                            style={{ fontSize: 9, fontWeight: 700, flexShrink: 0 }}
                          />
                          <Text size="sm" fw={500}>
                            {name || "—"}
                          </Text>
                        </Group>
                      </td>

                      {/* Username */}
                      <td style={{ padding: "9px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "3px 9px",
                            borderRadius: 20,
                            background: BRAND.purpleLight,
                            color: BRAND.purpleText,
                          }}
                        >
                          @{member.username}
                        </span>
                      </td>

                      {/* Email */}
                      <td style={{ padding: "9px 16px" }}>
                        <Text size="xs" c="dimmed">
                          {member.email || "—"}
                        </Text>
                      </td>

                      {/* Remove */}
                      <td style={{ padding: "9px 16px" }}>
                        <Tooltip
                          label="Remove from team"
                          withArrow
                          fz={11}
                          position="top"
                        >
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            style={{ color: BRAND.red }}
                            loading={removingId === member.id}
                            disabled={isLoading || removingId !== null}
                            onClick={() => handleRemove(member.id)}
                          >
                            <Icon icon="solar:user-minus-linear" width={15} />
                          </ActionIcon>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}

        {/* Footer */}
        {members.length > 0 && (
          <Box
            px="md"
            py="sm"
            style={{
              borderTop: "0.5px solid var(--mantine-color-default-border)",
            }}
          >
            <Text size="xs" c="dimmed">
              {members.length} member{members.length !== 1 ? "s" : ""} on this
              team
            </Text>
          </Box>
        )}
      </Box>
    </Stack>
  );
}
