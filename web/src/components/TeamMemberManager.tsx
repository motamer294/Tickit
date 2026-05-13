/**
 * Team Member Manager Component
 * Component for managing team members (add/remove)
 */

import { useState } from 'react'
import {
  Stack,
  Group,
  Button,
  Select,
  Table,
  ActionIcon,
  Badge,
  Text,
  Paper,
  LoadingOverlay,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import type { Team, User } from '@/api/departments.api'

interface TeamMemberManagerProps {
  team: Team
  allEmployees: User[]
  onAddMember: (userId: number) => Promise<void>
  onRemoveMember: (userId: number) => Promise<void>
  isLoading?: boolean
}

export function TeamMemberManager({
  team,
  allEmployees,
  onAddMember,
  onRemoveMember,
  isLoading = false,
}: TeamMemberManagerProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  // Get employees not already in the team
  const teamMemberIds = new Set((team.members || []).map((m) => m.id))
  const availableEmployees = allEmployees.filter((e) => !teamMemberIds.has(e.id))

  const handleAddMember = async () => {
    if (!selectedEmployeeId) return

    setIsAdding(true)
    try {
      await onAddMember(parseInt(selectedEmployeeId, 10))
      setSelectedEmployeeId(null)
      notifications.show({
        title: 'Member Added',
        message: 'Employee added to team successfully',
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add member',
        color: 'red',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    setRemovingId(memberId)
    try {
      await onRemoveMember(memberId)
      notifications.show({
        title: 'Member Removed',
        message: 'Employee removed from team',
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to remove member',
        color: 'red',
      })
    } finally {
      setRemovingId(null)
    }
  }

  const members = team.members || []

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay visible={isLoading} />

      {/* Add Member Section */}
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Text fw={600} size="sm">
            Add Team Member
          </Text>
          <Group gap="sm">
            <Select
              placeholder="Select an employee to add"
              data={availableEmployees.map((e) => ({
                value: e.id.toString(),
                label: e.first_name
                  ? `${e.first_name} ${e.last_name || ''}`
                  : e.username,
              }))}
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              searchable
              disabled={isAdding || availableEmployees.length === 0}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleAddMember}
              loading={isAdding}
              disabled={
                !selectedEmployeeId ||
                isAdding ||
                availableEmployees.length === 0
              }
            >
              Add
            </Button>
          </Group>
          {availableEmployees.length === 0 && (
            <Text size="sm" c="dimmed">
              All available employees are already in this team
            </Text>
          )}
        </Stack>
      </Paper>

      {/* Members List Section */}
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600} size="sm">
              Team Members ({members.length})
            </Text>
          </Group>

          {members.length > 0 ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Username</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th w="10%">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((member) => (
                  <Table.Tr key={member.id}>
                    <Table.Td>
                      {member.first_name
                        ? `${member.first_name} ${member.last_name || ''}`
                        : 'N/A'}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{member.username}</Badge>
                    </Table.Td>
                    <Table.Td>{member.email || 'N/A'}</Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        loading={removingId === member.id}
                        disabled={isLoading}
                        title="Remove from team"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" width={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text size="sm" c="dimmed">
              No members in this team yet
            </Text>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
