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
  Divider,
  Paper,
  Avatar,
  Box,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import type { Team, Department, User } from '@/api/departments.api'

// ─── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleLight: '#EEEDFE',
  purpleText:  '#3C3489',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
  redText:     '#791F1F',
  blue:        '#378ADD',
  blueLight:   '#E6F1FB',
  blueText:    '#0C447C',
}

const AVATAR_PALETTES = [
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#FAECE7', color: '#712B13' },
  { bg: '#E6F1FB', color: '#0C447C' },
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Props ─────────────────────────────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────────────────────────

export function TeamForm({
  opened,
  onClose,
  onSubmit,
  initialData,
  departments,
  employees,
  isLoading = false,
}: TeamFormProps) {
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [teamLeadId, setTeamLeadId]   = useState<string | null>(null)
  const [errors, setErrors]           = useState<Record<string, string>>({})

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

  useEffect(() => { if (opened) resetForm() }, [opened, resetForm])

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim())    newErrors.name          = 'Team name is required'
    if (!departmentId)   newErrors.department_id = 'Department is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        department_id: parseInt(departmentId!, 10),
        team_lead_id: teamLeadId ? parseInt(teamLeadId, 10) : undefined,
      })
      onClose()
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save team' })
    }
  }

  // Selected lead preview
  const selectedLead = teamLeadId
    ? employees.find((e) => e.id.toString() === teamLeadId)
    : null

  const leadDisplayName = (e: User) =>
    e.first_name ? `${e.first_name} ${e.last_name || ''}`.trim() : e.username

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8}>
          <Icon
            icon={initialData ? 'solar:pen-2-bold-duotone' : 'solar:people-nearby-bold-duotone'}
            width={18}
            style={{ color: BRAND.purple }}
          />
          <Text fw={500} size="sm">
            {initialData ? 'Edit team' : 'New team'}
          </Text>
        </Group>
      }
      centered
      radius="md"
      styles={{
        header: { borderBottom: '0.5px solid var(--mantine-color-default-border)', paddingBottom: 12 },
        body:   { paddingTop: 16 },
      }}
    >
      <Stack gap="md" pos="relative">
        <LoadingOverlay visible={isLoading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />

        {/* Name */}
        <TextInput
          label={<Text size="xs" fw={500} mb={4}>Team name</Text>}
          placeholder="e.g. Backend Team, Support Tier 1…"
          value={name}
          onChange={(e) => { setName(e.currentTarget.value); setErrors((p) => ({ ...p, name: '' })) }}
          error={errors.name}
          disabled={isLoading}
          required
          styles={{ input: { fontSize: 13 } }}
        />

        {/* Description */}
        <Textarea
          label={
            <Text size="xs" fw={500} mb={4}>
              Description <Text span size="xs" c="dimmed">(optional)</Text>
            </Text>
          }
          placeholder="Briefly describe this team's responsibilities…"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={2}
          disabled={isLoading}
          styles={{ input: { fontSize: 13 } }}
        />

        {/* Department */}
        <Select
          label={<Text size="xs" fw={500} mb={4}>Department</Text>}
          placeholder={departments.length === 0 ? 'No departments available' : 'Select a department…'}
          value={departmentId}
          onChange={(val) => { setDepartmentId(val); setErrors((p) => ({ ...p, department_id: '' })) }}
          data={departments.map((d) => ({ value: d.id.toString(), label: d.name }))}
          error={errors.department_id}
          disabled={isLoading || departments.length === 0}
          required
          searchable
          leftSection={<Icon icon="solar:buildings-3-linear" width={14} style={{ color: 'var(--mantine-color-dimmed)' }} />}
          styles={{ input: { fontSize: 13 } }}
        />

        {/* Team Lead */}
        <Box>
          <Select
            label={
              <Text size="xs" fw={500} mb={4}>
                Team lead <Text span size="xs" c="dimmed">(optional)</Text>
              </Text>
            }
            placeholder={employees.length === 0 ? 'No employees available' : 'Search and select…'}
            value={teamLeadId}
            onChange={setTeamLeadId}
            data={employees.map((e, i) => ({
              value: e.id.toString(),
              label: leadDisplayName(e),
            }))}
            disabled={isLoading || employees.length === 0}
            searchable
            clearable
            leftSection={<Icon icon="solar:user-check-linear" width={14} style={{ color: 'var(--mantine-color-dimmed)' }} />}
            styles={{ input: { fontSize: 13 } }}
          />

          {/* Selected lead preview */}
          {selectedLead && (
            <Group
              gap={8}
              mt={8}
              px="sm"
              py={7}
              style={{
                borderRadius: 8,
                background: BRAND.purpleLight,
                border: `0.5px solid ${BRAND.purple}33`,
              }}
            >
              <Avatar
                size={22}
                radius="xl"
                style={{
                  background: AVATAR_PALETTES[selectedLead.id % AVATAR_PALETTES.length].bg,
                  color: AVATAR_PALETTES[selectedLead.id % AVATAR_PALETTES.length].color,
                  fontSize: 8,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(leadDisplayName(selectedLead))}
              </Avatar>
              <Text size="xs" fw={500} style={{ color: BRAND.purpleText }}>
                {leadDisplayName(selectedLead)}
              </Text>
              <Text size="xs" c="dimmed" style={{ marginLeft: 'auto' }}>Team lead</Text>
            </Group>
          )}
        </Box>

        {/* Submit error */}
        {errors.submit && (
          <Paper
            p="sm"
            radius="md"
            style={{ background: BRAND.redLight, border: `0.5px solid ${BRAND.red}33` }}
          >
            <Group gap={6}>
              <Icon icon="solar:danger-triangle-linear" width={13} style={{ color: BRAND.red, flexShrink: 0 }} />
              <Text size="xs" style={{ color: BRAND.redText }}>{errors.submit}</Text>
            </Group>
          </Paper>
        )}

        <Divider />

        <Group justify="flex-end" gap={8}>
          <Button variant="default" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ background: BRAND.purpleDark, border: 'none' }}
            loading={isLoading}
            onClick={handleSubmit}
          >
            {initialData ? 'Save changes' : 'Create team'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
