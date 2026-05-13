/**
 * Team Form Component
 * Modal form for creating and editing teams
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  LoadingOverlay,
  Text,
} from '@mantine/core'
import type { Team, Department, User } from '@/api/departments.api'

interface TeamFormProps {
  opened: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    description?: string
    department_id: number
    team_lead_id?: number
  }) => Promise<void>
  initialData?: Team
  departments: Department[]
  employees: User[]
  isLoading?: boolean
}

export function TeamForm({
  opened,
  onClose,
  onSubmit,
  initialData,
  departments,
  employees,
  isLoading = false,
}: TeamFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [teamLeadId, setTeamLeadId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = useCallback(() => {
    if (initialData) {
      setName(initialData.name)
      setDescription(initialData.description || '')
      setDepartmentId(initialData.department_id.toString())
      setTeamLeadId(initialData.team_lead_id?.toString() || null)
    } else {
      setName('')
      setDescription('')
      setDepartmentId(null)
      setTeamLeadId(null)
    }
    setErrors({})
  }, [initialData])

  useEffect(() => {
    if (opened) {
      resetForm()
    }
  }, [opened, resetForm])

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Team name is required'
    }

    if (!departmentId) {
      newErrors.department_id = 'Department is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        department_id: parseInt(departmentId!, 10),
        team_lead_id: teamLeadId ? parseInt(teamLeadId, 10) : undefined,
      })
      onClose()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save team',
      })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialData ? 'Edit Team' : 'Create Team'}
      centered
    >
      <Stack gap="md" pos="relative">
        <LoadingOverlay visible={isLoading} />

        <TextInput
          label="Team Name"
          placeholder="e.g., Backend Team"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={errors.name}
          disabled={isLoading}
          required
        />

        <Textarea
          label="Description"
          placeholder="Brief description of the team"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
          disabled={isLoading}
        />

        <Select
          label="Department"
          placeholder="Select a department"
          value={departmentId}
          onChange={setDepartmentId}
          data={departments.map((d) => ({
            value: d.id.toString(),
            label: d.name,
          }))}
          error={errors.department_id}
          disabled={isLoading || departments.length === 0}
          required
          searchable
        />

        <Select
          label="Team Lead (Optional)"
          placeholder="Select team lead"
          value={teamLeadId}
          onChange={setTeamLeadId}
          data={employees.map((e) => ({
            value: e.id.toString(),
            label: e.first_name
              ? `${e.first_name} ${e.last_name || ''}`
              : e.username,
          }))}
          disabled={isLoading || employees.length === 0}
          searchable
          clearable
        />

        {errors.submit && (
          <Text c="red" size="sm">
            {errors.submit}
          </Text>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isLoading}>
            {initialData ? 'Update' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
