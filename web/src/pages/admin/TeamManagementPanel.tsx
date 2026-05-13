/**
 * Team Management Admin Panel
 * Manage departments, teams, and team members
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Button,
  Table,
  Badge,
  ActionIcon,
  Tabs,
  Center,
  Loader,
  Tooltip,
  Modal,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
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
} from '@/api/departments.api'
import { DepartmentForm } from '@/components/DepartmentForm'
import { TeamForm } from '@/components/TeamForm'
import { TeamMemberManager } from '@/components/TeamMemberManager'

// ============================================
// Component
// ============================================

export default function TeamManagementPanel() {
  const queryClient = useQueryClient()

  // State
  const [activeTab, setActiveTab] = useState<string | null>('departments')
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false)
  const [teamFormOpen, setTeamFormOpen] = useState(false)
  const [memberManagerOpen, setMemberManagerOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  )
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{
    type: 'department' | 'team'
    id: number
    name: string
  } | null>(null)

  // Queries
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    error: departmentsError,
  } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: fetchDepartmentsApi,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  const {
    data: teams = [],
    isLoading: teamsLoading,
    error: teamsError,
  } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => fetchTeamsApi(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  const {
    data: employees = [],
  } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: () => fetchEmployeesWithTeamApi(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  // Mutations
  const createDeptMutation = useMutation({
    mutationFn: (data: Parameters<typeof createDepartmentApi>[0]) =>
      createDepartmentApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] })
      notifications.show({
        title: 'Department Created',
        message: 'New department has been created successfully',
        color: 'green',
      })
      setDepartmentFormOpen(false)
      setEditingDepartment(null)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create department',
        color: 'red',
      })
    },
  })

  const updateDeptMutation = useMutation({
    mutationFn: async (data: {
      id: number
      payload: Parameters<typeof updateDepartmentApi>[1]
    }) => updateDepartmentApi(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] })
      notifications.show({
        title: 'Department Updated',
        message: 'Department has been updated successfully',
        color: 'green',
      })
      setDepartmentFormOpen(false)
      setEditingDepartment(null)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update department',
        color: 'red',
      })
    },
  })

  const deleteDeptMutation = useMutation({
    mutationFn: (id: number) => deleteDepartmentApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      notifications.show({
        title: 'Department Deleted',
        message: 'Department has been deleted successfully',
        color: 'green',
      })
      setDeleteConfirmOpen(false)
      setDeleteItem(null)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete department',
        color: 'red',
      })
    },
  })

  const createTeamMutation = useMutation({
    mutationFn: (data: Parameters<typeof createTeamApi>[0]) => createTeamApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      notifications.show({
        title: 'Team Created',
        message: 'New team has been created successfully',
        color: 'green',
      })
      setTeamFormOpen(false)
      setEditingTeam(null)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create team',
        color: 'red',
      })
    },
  })

  const updateTeamMutation = useMutation({
    mutationFn: async (data: {
      id: number
      payload: Parameters<typeof updateTeamApi>[1]
    }) => updateTeamApi(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      notifications.show({
        title: 'Team Updated',
        message: 'Team has been updated successfully',
        color: 'green',
      })
      setTeamFormOpen(false)
      setEditingTeam(null)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update team',
        color: 'red',
      })
    },
  })

  const deleteTeamMutation = useMutation({
    mutationFn: (id: number) => deleteTeamApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      notifications.show({
        title: 'Team Deleted',
        message: 'Team has been deleted successfully',
        color: 'green',
      })
      setDeleteConfirmOpen(false)
      setDeleteItem(null)
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete team',
        color: 'red',
      })
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: async (data: { teamId: number; userId: number }) =>
      addTeamMemberApi(data.teamId, data.userId),
    onSuccess: (updatedTeam) => {
      // Update selectedTeam immediately with the response data
      if (updatedTeam) {
        setSelectedTeam(updatedTeam as any)
      }
      // Invalidate queries for background refetch
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      if (selectedTeam) {
        queryClient.invalidateQueries({
          queryKey: ['team-detail', selectedTeam.id],
        })
      }
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add member',
        color: 'red',
      })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (data: { teamId: number; userId: number }) =>
      removeTeamMemberApi(data.teamId, data.userId),
    onSuccess: (updatedTeam) => {
      // Update selectedTeam immediately with the response data
      if (updatedTeam) {
        setSelectedTeam(updatedTeam as any)
      }
      // Invalidate queries for background refetch
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      if (selectedTeam) {
        queryClient.invalidateQueries({
          queryKey: ['team-detail', selectedTeam.id],
        })
      }
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to remove member',
        color: 'red',
      })
    },
  })

  // Handlers
  const handleDeleteClick = (
    type: 'department' | 'team',
    id: number,
    name: string,
  ) => {
    setDeleteItem({ type, id, name })
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteItem) return

    if (deleteItem.type === 'department') {
      deleteDeptMutation.mutate(deleteItem.id)
    } else {
      deleteTeamMutation.mutate(deleteItem.id)
    }
  }

  const handleOpenTeamManager = async (team: Team) => {
    // Fetch full team details with members
    try {
      const fullTeam = await fetchTeamDetailApi(team.id)
      setSelectedTeam(fullTeam)
      setMemberManagerOpen(true)
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to load team details',
        color: 'red',
      })
    }
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Text size="lg" fw={700}>
              Team Management
            </Text>
            <Text size="sm" c="dimmed">
              Manage departments, teams, and team members
            </Text>
          </div>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="departments" leftSection={<Icon icon="solar:organization-linear" width={18} />}>
              Departments
            </Tabs.Tab>
            <Tabs.Tab value="teams" leftSection={<Icon icon="solar:people-nearby-bold-duotone" width={18} />}>
              Teams
            </Tabs.Tab>
          </Tabs.List>

          {/* Departments Tab */}
          <Tabs.Panel value="departments" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Departments ({departments.length})</Text>
                <Button
                  leftSection={<Icon icon="solar:add-circle-bold-duotone" width={18} />}
                  onClick={() => {
                    setEditingDepartment(null)
                    setDepartmentFormOpen(true)
                  }}
                >
                  New Department
                </Button>
              </Group>

              {departmentsLoading ? (
                <Center py="xl">
                  <Loader />
                </Center>
              ) : departmentsError ? (
                <Paper p="md" radius="md" bg="red.0">
                  <Text c="red">Failed to load departments</Text>
                </Paper>
              ) : departments.length === 0 ? (
                <Paper p="md" radius="md" withBorder>
                  <Center>
                    <Text c="dimmed">No departments created yet</Text>
                  </Center>
                </Paper>
              ) : (
                <Paper radius="md" withBorder>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Description</Table.Th>
                        <Table.Th w="15%">Teams</Table.Th>
                        <Table.Th w="15%">Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {departments.map((dept) => (
                        <Table.Tr key={dept.id}>
                          <Table.Td fw={500}>{dept.name}</Table.Td>
                          <Table.Td c="dimmed">
                            {dept.description || '—'}
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light">
                              {dept.team_count ?? 0} teams
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Edit">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  size="sm"
                                  onClick={() => {
                                    setEditingDepartment(dept)
                                    setDepartmentFormOpen(true)
                                  }}
                                >
                                  <Icon icon="solar:pen-new-round-linear" width={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Delete">
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteClick('department', dept.id, dept.name)
                                  }
                                >
                                  <Icon icon="solar:trash-bin-trash-linear" width={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Teams Tab */}
          <Tabs.Panel value="teams" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Teams ({teams.length})</Text>
                <Button
                  leftSection={<Icon icon="solar:add-circle-bold-duotone" width={18} />}
                  onClick={() => {
                    setEditingTeam(null)
                    setTeamFormOpen(true)
                  }}
                >
                  New Team
                </Button>
              </Group>

              {teamsLoading ? (
                <Center py="xl">
                  <Loader />
                </Center>
              ) : teamsError ? (
                <Paper p="md" radius="md" bg="red.0">
                  <Text c="red">Failed to load teams</Text>
                </Paper>
              ) : teams.length === 0 ? (
                <Paper p="md" radius="md" withBorder>
                  <Center>
                    <Text c="dimmed">No teams created yet</Text>
                  </Center>
                </Paper>
              ) : (
                <Paper radius="md" withBorder>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Team Name</Table.Th>
                        <Table.Th>Department</Table.Th>
                        <Table.Th w="12%">Members</Table.Th>
                        <Table.Th w="20%">Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {teams.map((team) => {
                        const dept = departments.find((d) => d.id === team.department_id)
                        return (
                          <Table.Tr key={team.id}>
                            <Table.Td fw={500}>{team.name}</Table.Td>
                            <Table.Td>{dept?.name || 'Unknown'}</Table.Td>
                            <Table.Td>
                              <Badge variant="light">
                                {team.employee_count ?? 0} members
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Tooltip label="Manage Members">
                                  <ActionIcon
                                    variant="light"
                                    color="grape"
                                    size="sm"
                                    onClick={() => handleOpenTeamManager(team)}
                                  >
                                    <Icon icon="solar:users-group-rounded-linear" width={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Edit">
                                  <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTeam(team)
                                      setTeamFormOpen(true)
                                    }}
                                  >
                                    <Icon icon="solar:pen-new-round-linear" width={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Delete">
                                  <ActionIcon
                                    variant="light"
                                    color="red"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteClick('team', team.id, team.name)
                                    }
                                  >
                                    <Icon icon="solar:trash-bin-trash-linear" width={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        )
                      })}
                    </Table.Tbody>
                  </Table>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Department Form Modal */}
      <DepartmentForm
        opened={departmentFormOpen}
        onClose={() => {
          setDepartmentFormOpen(false)
          setEditingDepartment(null)
        }}
        onSubmit={async (data) => {
          if (editingDepartment) {
            updateDeptMutation.mutate({
              id: editingDepartment.id,
              payload: data,
            })
          } else {
            createDeptMutation.mutate(data)
          }
        }}
        initialData={editingDepartment || undefined}
        isLoading={createDeptMutation.isPending || updateDeptMutation.isPending}
      />

      {/* Team Form Modal */}
      <TeamForm
        opened={teamFormOpen}
        onClose={() => {
          setTeamFormOpen(false)
          setEditingTeam(null)
        }}
        onSubmit={async (data) => {
          if (editingTeam) {
            updateTeamMutation.mutate({
              id: editingTeam.id,
              payload: data,
            })
          } else {
            createTeamMutation.mutate(data)
          }
        }}
        initialData={editingTeam || undefined}
        departments={departments}
        employees={employees}
        isLoading={createTeamMutation.isPending || updateTeamMutation.isPending}
      />

      {/* Member Manager Modal */}
      <Modal
        opened={memberManagerOpen}
        onClose={() => {
          setMemberManagerOpen(false)
          setSelectedTeam(null)
        }}
        title={selectedTeam ? `Manage ${selectedTeam.name} Members` : 'Manage Members'}
        size="lg"
        centered
      >
        {selectedTeam && (
          <TeamMemberManager
            team={selectedTeam}
            allEmployees={employees}
            onAddMember={async (userId) => {
              await addMemberMutation.mutateAsync({
                teamId: selectedTeam.id,
                userId,
              })
            }}
            onRemoveMember={async (userId) => {
              await removeMemberMutation.mutateAsync({
                teamId: selectedTeam.id,
                userId,
              })
            }}
            isLoading={addMemberMutation.isPending || removeMemberMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setDeleteItem(null)
        }}
        title="Confirm Delete"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete {deleteItem?.type} "{deleteItem?.name}"?
            This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setDeleteItem(null)
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleteDeptMutation.isPending || deleteTeamMutation.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
