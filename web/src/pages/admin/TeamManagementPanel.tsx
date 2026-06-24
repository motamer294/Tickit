/**
 * Team Management Admin Panel
 * Manage departments, teams, and team members
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Button,
  ActionIcon,
  Tabs,
  Center,
  Skeleton,
  SimpleGrid,
  Tooltip,
  Modal,
  Box,
  Avatar,
  TextInput,
} from "@mantine/core";
import { Icon } from "@iconify-icon/react";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@/utils/customNotifications";
import {
  fetchDepartmentsApi,
  fetchTeamsApi,
  fetchEmployeesWithTeamApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
  createTeamApi,
  updateTeamApi,
  deleteTeamApi,
  fetchTeamDetailApi,
  addTeamMemberApi,
  removeTeamMemberApi,
  type Department,
  type Team,
} from "@/api/departments.api";
import { DepartmentForm } from "@/components/DepartmentForm";
import { TeamForm } from "@/components/TeamForm";
import { TeamMemberManager } from "@/components/TeamMemberManager";

//  Brand palette (matches Dashboard, TicketsList, UserAdminPanel) 

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

const AVATAR_PALETTES = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FBEAF0", color: "#72243E" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

//  Shared sub-components 

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
        flex: 1,
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

// Pill count badge inline
function CountBadge({ value, label }: { value: number; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 9px",
        borderRadius: 20,
        background: BRAND.purpleLight,
        color: BRAND.purpleText,
        whiteSpace: "nowrap",
      }}
    >
      {value} {label}
    </span>
  );
}

const TH_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--mantine-color-dimmed)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  paddingBottom: 10,
  whiteSpace: "nowrap",
};

function DeptMobileCard({
  dept,
  pal,
  onEdit,
  onDelete,
}: {
  dept: Department;
  pal: { bg: string; color: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Box p="sm" style={{ borderBottom: "0.5px solid var(--mantine-color-default-border)" }}>
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Group gap={8} wrap="nowrap">
          <Avatar size={26} radius="md" style={{ background: pal.bg, color: pal.color, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
            {getInitials(dept.name)}
          </Avatar>
          <Text size="sm" fw={500}>{dept.name}</Text>
        </Group>
        <CountBadge value={dept.team_count ?? 0} label="teams" />
      </Group>
      {dept.description && <Text size="xs" c="dimmed" mb={8}>{dept.description}</Text>}
      <Group justify="flex-end" gap={4}>
        <ActionIcon variant="subtle" size="sm" style={{ color: BRAND.purpleDark }} onClick={onEdit}>
          <Icon icon="solar:pen-2-linear" width={14} />
        </ActionIcon>
        <ActionIcon variant="subtle" size="sm" style={{ color: BRAND.red }} onClick={onDelete}>
          <Icon icon="solar:trash-bin-2-linear" width={14} />
        </ActionIcon>
      </Group>
    </Box>
  );
}

function TeamMobileCard({
  team,
  dept,
  pal,
  onManage,
  onEdit,
  onDelete,
}: {
  team: Team;
  dept: Department | undefined;
  pal: { bg: string; color: string };
  onManage: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Box p="sm" style={{ borderBottom: "0.5px solid var(--mantine-color-default-border)" }}>
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Group gap={8} wrap="nowrap">
          <Avatar size={26} radius="md" style={{ background: pal.bg, color: pal.color, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
            {getInitials(team.name)}
          </Avatar>
          <Text size="sm" fw={500}>{team.name}</Text>
        </Group>
        <CountBadge value={team.employee_count ?? 0} label="members" />
      </Group>
      {dept && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: BRAND.blueLight, color: BRAND.blueText, whiteSpace: "nowrap" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: BRAND.blue, flexShrink: 0 }} />
          {dept.name}
        </span>
      )}
      <Group justify="flex-end" gap={4} mt={8}>
        <ActionIcon variant="subtle" size="sm" style={{ color: BRAND.purple }} onClick={onManage}>
          <Icon icon="solar:users-group-rounded-linear" width={14} />
        </ActionIcon>
        <ActionIcon variant="subtle" size="sm" style={{ color: BRAND.purpleDark }} onClick={onEdit}>
          <Icon icon="solar:pen-2-linear" width={14} />
        </ActionIcon>
        <ActionIcon variant="subtle" size="sm" style={{ color: BRAND.red }} onClick={onDelete}>
          <Icon icon="solar:trash-bin-2-linear" width={14} />
        </ActionIcon>
      </Group>
    </Box>
  );
}

//  Main Component 

export default function TeamManagementPanel() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string | null>("departments");
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [memberManagerOpen, setMemberManagerOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{
    type: "department" | "team";
    id: number;
    name: string;
  } | null>(null);
  const [deptSearch, setDeptSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");

  const isMobile = useMediaQuery("(max-width: 640px)");

  //  Queries 
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    error: departmentsError,
  } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: fetchDepartmentsApi,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const {
    data: teams = [],
    isLoading: teamsLoading,
    error: teamsError,
  } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => fetchTeamsApi(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => fetchEmployeesWithTeamApi(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  //  Mutations 
  const createDeptMutation = useMutation({
    mutationFn: (data: Parameters<typeof createDepartmentApi>[0]) =>
      createDepartmentApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      notifications.show({
        title: "Department created",
        message: "New department has been created successfully",
        color: "green",
      });
      setDepartmentFormOpen(false);
      setEditingDepartment(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message:
          err instanceof Error ? err.message : "Failed to create department",
        color: "red",
      }),
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof updateDepartmentApi>[1];
    }) => updateDepartmentApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      notifications.show({
        title: "Department updated",
        message: "Department has been updated successfully",
        color: "green",
      });
      setDepartmentFormOpen(false);
      setEditingDepartment(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message:
          err instanceof Error ? err.message : "Failed to update department",
        color: "red",
      }),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: number) => deleteDepartmentApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      notifications.show({
        title: "Department deleted",
        message: "Department has been deleted",
        color: "green",
      });
      setDeleteConfirmOpen(false);
      setDeleteItem(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message:
          err instanceof Error ? err.message : "Failed to delete department",
        color: "red",
      }),
  });

  const createTeamMutation = useMutation({
    mutationFn: (data: Parameters<typeof createTeamApi>[0]) =>
      createTeamApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      notifications.show({
        title: "Team created",
        message: "New team has been created successfully",
        color: "green",
      });
      setTeamFormOpen(false);
      setEditingTeam(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to create team",
        color: "red",
      }),
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof updateTeamApi>[1];
    }) => updateTeamApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      notifications.show({
        title: "Team updated",
        message: "Team has been updated successfully",
        color: "green",
      });
      setTeamFormOpen(false);
      setEditingTeam(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update team",
        color: "red",
      }),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: number) => deleteTeamApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      notifications.show({
        title: "Team deleted",
        message: "Team has been deleted",
        color: "green",
      });
      setDeleteConfirmOpen(false);
      setDeleteItem(null);
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to delete team",
        color: "red",
      }),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      addTeamMemberApi(teamId, userId),
    onSuccess: (updatedTeam) => {
      if (updatedTeam) setSelectedTeam(updatedTeam);
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      if (selectedTeam)
        queryClient.invalidateQueries({
          queryKey: ["team-detail", selectedTeam.id],
        });
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to add member",
        color: "red",
      }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      removeTeamMemberApi(teamId, userId),
    onSuccess: (updatedTeam) => {
      if (updatedTeam) setSelectedTeam(updatedTeam);
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      if (selectedTeam)
        queryClient.invalidateQueries({
          queryKey: ["team-detail", selectedTeam.id],
        });
    },
    onError: (err) =>
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to remove member",
        color: "red",
      }),
  });

  //  Handlers 
  const handleDeleteClick = (
    type: "department" | "team",
    id: number,
    name: string,
  ) => {
    setDeleteItem({ type, id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    if (deleteItem.type === "department")
      deleteDeptMutation.mutate(deleteItem.id);
    else deleteTeamMutation.mutate(deleteItem.id);
  };

  const handleOpenTeamManager = async (team: Team) => {
    try {
      const fullTeam = await fetchTeamDetailApi(team.id);
      setSelectedTeam(fullTeam);
      setMemberManagerOpen(true);
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to load team details",
        color: "red",
      });
    }
  };

  //  Filtered lists 
  const filteredDepts = useMemo(() => {
    if (!deptSearch.trim()) return departments;
    const q = deptSearch.toLowerCase();
    return departments.filter(
      (d: Department) =>
        d.name.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q),
    );
  }, [departments, deptSearch]);

  const filteredTeams = useMemo(() => {
    if (!teamSearch.trim()) return teams;
    const q = teamSearch.toLowerCase();
    return teams.filter((t: Team) => t.name.toLowerCase().includes(q));
  }, [teams, teamSearch]);

  //  Derived counts 
  const totalMembers = teams.reduce(
    (s: number, t: Team) => s + (t.employee_count ?? 0),
    0,
  );

  //  Render 

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/*  Header  */}
        <Group justify="space-between" align="flex-end" wrap="wrap" gap={12}>
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>
              Team Management
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Manage departments, teams, and team members
            </Text>
          </Box>
        </Group>

        {/*  Stat cards  */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing={10}>
          <StatCard
            label="Departments"
            value={departments.length}
            icon="solar:buildings-3-linear"
            accentColor={BRAND.purple}
          />
          <StatCard
            label="Teams"
            value={teams.length}
            icon="solar:people-nearby-linear"
            accentColor={BRAND.blue}
          />
          <StatCard
            label="Total members"
            value={totalMembers}
            icon="solar:users-group-two-rounded-linear"
            accentColor={BRAND.green}
          />
          <StatCard
            label="Employees"
            value={employees.length}
            icon="solar:user-id-linear"
            accentColor={BRAND.amber}
          />
        </SimpleGrid>

        {/*  Tabs  */}
        <Paper
          radius="md"
          style={{
            border: "0.5px solid var(--mantine-color-default-border)",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            styles={{
              list: {
                padding: "0 16px",
                borderBottom: "0.5px solid var(--mantine-color-default-border)",
                gap: 0,
              },
              tab: { fontSize: 13, fontWeight: 500, padding: "12px 16px" },
            }}
          >
            <Tabs.List>
              <Tabs.Tab
                value="departments"
                leftSection={
                  <Icon icon="solar:buildings-3-linear" width={15} />
                }
              >
                Departments
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background:
                      activeTab === "departments"
                        ? BRAND.purpleLight
                        : "var(--mantine-color-default-hover)",
                    color:
                      activeTab === "departments"
                        ? BRAND.purpleText
                        : "var(--mantine-color-dimmed)",
                  }}
                >
                  {departments.length}
                </span>
              </Tabs.Tab>
              <Tabs.Tab
                value="teams"
                leftSection={
                  <Icon icon="solar:people-nearby-linear" width={15} />
                }
              >
                Teams
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background:
                      activeTab === "teams"
                        ? BRAND.purpleLight
                        : "var(--mantine-color-default-hover)",
                    color:
                      activeTab === "teams"
                        ? BRAND.purpleText
                        : "var(--mantine-color-dimmed)",
                  }}
                >
                  {teams.length}
                </span>
              </Tabs.Tab>
            </Tabs.List>

            {/*  Departments panel  */}
            <Tabs.Panel value="departments">
              <Box p="md">
                <Group justify="space-between" mb="md">
                  <TextInput
                    placeholder="Search departments…"
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.currentTarget.value)}
                    leftSection={
                      <Icon
                        icon="solar:magnifer-linear"
                        width={14}
                        style={{ color: "var(--mantine-color-dimmed)" }}
                      />
                    }
                    rightSection={
                      deptSearch ? (
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          onClick={() => setDeptSearch("")}
                        >
                          <Icon icon="solar:close-circle-linear" width={13} />
                        </ActionIcon>
                      ) : null
                    }
                    style={{ width: 240 }}
                    styles={{ input: { fontSize: 13, height: 34 } }}
                  />
                  <Button
                    size="sm"
                    leftSection={
                      <Icon icon="solar:add-circle-bold-duotone" width={15} />
                    }
                    style={{ background: BRAND.purpleDark, border: "none" }}
                    onClick={() => {
                      setEditingDepartment(null);
                      setDepartmentFormOpen(true);
                    }}
                  >
                    New department
                  </Button>
                </Group>

                {departmentsLoading ? (
                  <Stack gap={0}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Box key={i} style={{ padding: "10px 12px", borderBottom: i < 4 ? "0.5px solid var(--mantine-color-default-border)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                        <Skeleton height={30} width={30} radius="md" />
                        <Skeleton height={14} style={{ flex: 1 }} radius="sm" />
                        <Skeleton height={14} width={100} radius="sm" />
                        <Skeleton height={22} width={60} radius="xl" />
                        <Skeleton height={26} width={56} radius="sm" />
                      </Box>
                    ))}
                  </Stack>
                ) : departmentsError ? (
                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: BRAND.redLight,
                      border: `0.5px solid ${BRAND.red}33`,
                    }}
                  >
                    <Group gap={8}>
                      <Icon
                        icon="solar:danger-triangle-linear"
                        width={15}
                        style={{ color: BRAND.red }}
                      />
                      <Text size="sm" style={{ color: BRAND.redText }}>
                        Failed to load departments
                      </Text>
                    </Group>
                  </Paper>
                ) : filteredDepts.length === 0 ? (
                  <Center py={80}>
                    <Stack align="center" gap="sm">
                      <Icon
                        icon="solar:buildings-3-linear"
                        width={36}
                        style={{
                          color: "var(--mantine-color-dimmed)",
                          opacity: 0.4,
                        }}
                      />
                      <Text size="sm" c="dimmed">
                        {deptSearch
                          ? "No departments match your search"
                          : "No departments created yet"}
                      </Text>
                      {deptSearch && (
                        <Button
                          variant="subtle"
                          size="xs"
                          style={{ color: BRAND.purpleDark }}
                          onClick={() => setDeptSearch("")}
                        >
                          Clear search
                        </Button>
                      )}
                    </Stack>
                  </Center>
                ) : isMobile ? (
                  <Stack gap={0}>
                    {filteredDepts.map((dept: Department, idx: number) => (
                      <DeptMobileCard
                        key={dept.id}
                        dept={dept}
                        pal={AVATAR_PALETTES[idx % AVATAR_PALETTES.length]}
                        onEdit={() => { setEditingDepartment(dept); setDepartmentFormOpen(true); }}
                        onDelete={() => handleDeleteClick("department", dept.id, dept.name)}
                      />
                    ))}
                  </Stack>
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
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}>
                            Department
                          </th>
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}>
                            Description
                          </th>
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}>
                            Teams
                          </th>
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDepts.map((dept: Department, idx: number) => {
                          const pal =
                            AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
                          return (
                            <tr
                              key={dept.id}
                              style={{
                                borderBottom:
                                  idx < filteredDepts.length - 1
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
                              <td style={{ padding: "10px 12px" }}>
                                <Group gap={10} wrap="nowrap">
                                  <Avatar
                                    size={30}
                                    radius="md"
                                    style={{
                                      background: pal.bg,
                                      color: pal.color,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {getInitials(dept.name)}
                                  </Avatar>
                                  <Text size="sm" fw={500}>
                                    {dept.name}
                                  </Text>
                                </Group>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <Text size="sm" c="dimmed">
                                  {dept.description || "—"}
                                </Text>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <CountBadge
                                  value={dept.team_count ?? 0}
                                  label="teams"
                                />
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <Group gap={4} justify="flex-end" wrap="nowrap">
                                  <Tooltip
                                    label="Edit department"
                                    withArrow
                                    fz={11}
                                    position="top"
                                  >
                                    <ActionIcon
                                      variant="subtle"
                                      size="sm"
                                      style={{ color: BRAND.purpleDark }}
                                      onClick={() => {
                                        setEditingDepartment(dept);
                                        setDepartmentFormOpen(true);
                                      }}
                                    >
                                      <Icon
                                        icon="solar:pen-2-linear"
                                        width={15}
                                      />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip
                                    label="Delete department"
                                    withArrow
                                    fz={11}
                                    position="top"
                                  >
                                    <ActionIcon
                                      variant="subtle"
                                      size="sm"
                                      style={{ color: BRAND.red }}
                                      onClick={() =>
                                        handleDeleteClick(
                                          "department",
                                          dept.id,
                                          dept.name,
                                        )
                                      }
                                    >
                                      <Icon
                                        icon="solar:trash-bin-2-linear"
                                        width={15}
                                      />
                                    </ActionIcon>
                                  </Tooltip>
                                </Group>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                )}

                {/* Footer */}
                {filteredDepts.length > 0 && (
                  <Box
                    px={0}
                    pt="sm"
                    mt="sm"
                    style={{
                      borderTop:
                        "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Showing{" "}
                      <span
                        style={{
                          fontWeight: 500,
                          color: "var(--mantine-color-text)",
                        }}
                      >
                        {filteredDepts.length}
                      </span>{" "}
                      of{" "}
                      <span
                        style={{
                          fontWeight: 500,
                          color: "var(--mantine-color-text)",
                        }}
                      >
                        {departments.length}
                      </span>{" "}
                      departments
                    </Text>
                  </Box>
                )}
              </Box>
            </Tabs.Panel>

            {/*  Teams panel  */}
            <Tabs.Panel value="teams">
              <Box p="md">
                <Group justify="space-between" mb="md">
                  <TextInput
                    placeholder="Search teams…"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.currentTarget.value)}
                    leftSection={
                      <Icon
                        icon="solar:magnifer-linear"
                        width={14}
                        style={{ color: "var(--mantine-color-dimmed)" }}
                      />
                    }
                    rightSection={
                      teamSearch ? (
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          onClick={() => setTeamSearch("")}
                        >
                          <Icon icon="solar:close-circle-linear" width={13} />
                        </ActionIcon>
                      ) : null
                    }
                    style={{ width: 240 }}
                    styles={{ input: { fontSize: 13, height: 34 } }}
                  />
                  <Button
                    size="sm"
                    leftSection={
                      <Icon icon="solar:add-circle-bold-duotone" width={15} />
                    }
                    style={{ background: BRAND.purpleDark, border: "none" }}
                    onClick={() => {
                      setEditingTeam(null);
                      setTeamFormOpen(true);
                    }}
                  >
                    New team
                  </Button>
                </Group>

                {teamsLoading ? (
                  <Stack gap={0}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Box key={i} style={{ padding: "10px 12px", borderBottom: i < 4 ? "0.5px solid var(--mantine-color-default-border)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                        <Skeleton height={30} width={30} radius="md" />
                        <Skeleton height={14} style={{ flex: 1 }} radius="sm" />
                        <Skeleton height={22} width={80} radius="xl" />
                        <Skeleton height={22} width={70} radius="xl" />
                        <Skeleton height={26} width={70} radius="sm" />
                      </Box>
                    ))}
                  </Stack>
                ) : teamsError ? (
                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: BRAND.redLight,
                      border: `0.5px solid ${BRAND.red}33`,
                    }}
                  >
                    <Group gap={8}>
                      <Icon
                        icon="solar:danger-triangle-linear"
                        width={15}
                        style={{ color: BRAND.red }}
                      />
                      <Text size="sm" style={{ color: BRAND.redText }}>
                        Failed to load teams
                      </Text>
                    </Group>
                  </Paper>
                ) : filteredTeams.length === 0 ? (
                  <Center py={80}>
                    <Stack align="center" gap="sm">
                      <Icon
                        icon="solar:people-nearby-linear"
                        width={36}
                        style={{
                          color: "var(--mantine-color-dimmed)",
                          opacity: 0.4,
                        }}
                      />
                      <Text size="sm" c="dimmed">
                        {teamSearch
                          ? "No teams match your search"
                          : "No teams created yet"}
                      </Text>
                      {teamSearch && (
                        <Button
                          variant="subtle"
                          size="xs"
                          style={{ color: BRAND.purpleDark }}
                          onClick={() => setTeamSearch("")}
                        >
                          Clear search
                        </Button>
                      )}
                    </Stack>
                  </Center>
                ) : isMobile ? (
                  <Stack gap={0}>
                    {filteredTeams.map((team: Team, idx: number) => {
                      const dept = departments.find((d: Department) => d.id === team.department_id);
                      return (
                        <TeamMobileCard
                          key={team.id}
                          team={team}
                          dept={dept}
                          pal={AVATAR_PALETTES[idx % AVATAR_PALETTES.length]}
                          onManage={() => handleOpenTeamManager(team)}
                          onEdit={() => { setEditingTeam(team); setTeamFormOpen(true); }}
                          onDelete={() => handleDeleteClick("team", team.id, team.name)}
                        />
                      );
                    })}
                  </Stack>
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
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}>
                            Team
                          </th>
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}>
                            Department
                          </th>
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}>
                            Members
                          </th>
                          <th style={{ ...TH_STYLE, padding: "8px 12px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeams.map((team: Team, idx: number) => {
                          const dept = departments.find(
                            (d: Department) => d.id === team.department_id,
                          );
                          const pal =
                            AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
                          return (
                            <tr
                              key={team.id}
                              style={{
                                borderBottom:
                                  idx < filteredTeams.length - 1
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
                              {/* Team name */}
                              <td style={{ padding: "10px 12px" }}>
                                <Group gap={10} wrap="nowrap">
                                  <Avatar
                                    size={30}
                                    radius="md"
                                    style={{
                                      background: pal.bg,
                                      color: pal.color,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {getInitials(team.name)}
                                  </Avatar>
                                  <Text size="sm" fw={500}>
                                    {team.name}
                                  </Text>
                                </Group>
                              </td>

                              {/* Department */}
                              <td style={{ padding: "10px 12px" }}>
                                {dept ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      fontSize: 11,
                                      fontWeight: 500,
                                      padding: "3px 9px",
                                      borderRadius: 20,
                                      background: BRAND.blueLight,
                                      color: BRAND.blueText,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: BRAND.blue,
                                        flexShrink: 0,
                                      }}
                                    />
                                    {dept.name}
                                  </span>
                                ) : (
                                  <Text size="xs" c="dimmed">
                                    —
                                  </Text>
                                )}
                              </td>

                              {/* Members */}
                              <td style={{ padding: "10px 12px" }}>
                                <CountBadge
                                  value={team.employee_count ?? 0}
                                  label="members"
                                />
                              </td>

                              {/* Actions */}
                              <td style={{ padding: "10px 12px" }}>
                                <Group gap={4} justify="flex-end" wrap="nowrap">
                                  <Tooltip
                                    label="Manage members"
                                    withArrow
                                    fz={11}
                                    position="top"
                                  >
                                    <ActionIcon
                                      variant="subtle"
                                      size="sm"
                                      style={{ color: BRAND.purple }}
                                      onClick={() =>
                                        handleOpenTeamManager(team)
                                      }
                                    >
                                      <Icon
                                        icon="solar:users-group-rounded-linear"
                                        width={15}
                                      />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip
                                    label="Edit team"
                                    withArrow
                                    fz={11}
                                    position="top"
                                  >
                                    <ActionIcon
                                      variant="subtle"
                                      size="sm"
                                      style={{ color: BRAND.purpleDark }}
                                      onClick={() => {
                                        setEditingTeam(team);
                                        setTeamFormOpen(true);
                                      }}
                                    >
                                      <Icon
                                        icon="solar:pen-2-linear"
                                        width={15}
                                      />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip
                                    label="Delete team"
                                    withArrow
                                    fz={11}
                                    position="top"
                                  >
                                    <ActionIcon
                                      variant="subtle"
                                      size="sm"
                                      style={{ color: BRAND.red }}
                                      onClick={() =>
                                        handleDeleteClick(
                                          "team",
                                          team.id,
                                          team.name,
                                        )
                                      }
                                    >
                                      <Icon
                                        icon="solar:trash-bin-2-linear"
                                        width={15}
                                      />
                                    </ActionIcon>
                                  </Tooltip>
                                </Group>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                )}

                {/* Footer */}
                {filteredTeams.length > 0 && (
                  <Box
                    pt="sm"
                    mt="sm"
                    style={{
                      borderTop:
                        "0.5px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Showing{" "}
                      <span
                        style={{
                          fontWeight: 500,
                          color: "var(--mantine-color-text)",
                        }}
                      >
                        {filteredTeams.length}
                      </span>{" "}
                      of{" "}
                      <span
                        style={{
                          fontWeight: 500,
                          color: "var(--mantine-color-text)",
                        }}
                      >
                        {teams.length}
                      </span>{" "}
                      teams
                    </Text>
                  </Box>
                )}
              </Box>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Stack>

      {/*  Department Form Modal  */}
      <DepartmentForm
        opened={departmentFormOpen}
        onClose={() => {
          setDepartmentFormOpen(false);
          setEditingDepartment(null);
        }}
        onSubmit={async (data) => {
          if (editingDepartment)
            updateDeptMutation.mutate({
              id: editingDepartment.id,
              payload: data,
            });
          else createDeptMutation.mutate(data);
        }}
        initialData={editingDepartment || undefined}
        isLoading={createDeptMutation.isPending || updateDeptMutation.isPending}
      />

      {/*  Team Form Modal  */}
      <TeamForm
        opened={teamFormOpen}
        onClose={() => {
          setTeamFormOpen(false);
          setEditingTeam(null);
        }}
        onSubmit={async (data) => {
          if (editingTeam)
            updateTeamMutation.mutate({ id: editingTeam.id, payload: data });
          else createTeamMutation.mutate(data);
        }}
        initialData={editingTeam || undefined}
        departments={departments}
        employees={employees}
        isLoading={createTeamMutation.isPending || updateTeamMutation.isPending}
      />

      {/*  Member Manager Modal  */}
      <Modal
        opened={memberManagerOpen}
        onClose={() => {
          setMemberManagerOpen(false);
          setSelectedTeam(null);
        }}
        title={
          <Group gap={8}>
            <Icon
              icon="solar:users-group-rounded-bold-duotone"
              width={18}
              style={{ color: BRAND.purple }}
            />
            <Text fw={500} size="sm">
              {selectedTeam
                ? `${selectedTeam.name} · Members`
                : "Manage members"}
            </Text>
          </Group>
        }
        size="lg"
        centered
        radius="md"
        styles={{
          header: {
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
            paddingBottom: 12,
          },
          body: { paddingTop: 16 },
        }}
      >
        {selectedTeam && (
          <TeamMemberManager
            team={selectedTeam}
            allEmployees={employees}
            onAddMember={async (userId) => {
              await addMemberMutation.mutateAsync({
                teamId: selectedTeam.id,
                userId,
              });
            }}
            onRemoveMember={async (userId) => {
              await removeMemberMutation.mutateAsync({
                teamId: selectedTeam.id,
                userId,
              });
            }}
            isLoading={
              addMemberMutation.isPending || removeMemberMutation.isPending
            }
          />
        )}
      </Modal>

      {/*  Delete Confirmation Modal  */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteItem(null);
        }}
        title={
          <Group gap={8}>
            <Icon
              icon="solar:danger-triangle-bold-duotone"
              width={18}
              style={{ color: BRAND.red }}
            />
            <Text fw={500} size="sm">
              Confirm deletion
            </Text>
          </Group>
        }
        size="sm"
        centered
        radius="md"
        styles={{
          header: {
            borderBottom: "0.5px solid var(--mantine-color-default-border)",
            paddingBottom: 12,
          },
          body: { paddingTop: 16 },
        }}
      >
        <Stack gap="lg">
          <Paper
            p="md"
            radius="md"
            style={{
              background: BRAND.redLight,
              border: `0.5px solid ${BRAND.red}33`,
            }}
          >
            <Group gap={8} align="flex-start">
              <Icon
                icon="solar:info-circle-linear"
                width={15}
                style={{ color: BRAND.red, marginTop: 1, flexShrink: 0 }}
              />
              <Text size="sm" style={{ color: BRAND.redText }}>
                You are about to delete the {deleteItem?.type}{" "}
                <strong>"{deleteItem?.name}"</strong>. This action cannot be
                undone.
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" gap={8}>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: BRAND.red, border: "none" }}
              loading={
                deleteDeptMutation.isPending || deleteTeamMutation.isPending
              }
              onClick={handleConfirmDelete}
            >
              Delete {deleteItem?.type}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
