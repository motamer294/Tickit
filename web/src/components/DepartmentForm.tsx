/**
 * Department Form Component
 * Modal form for creating and editing departments
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  LoadingOverlay,
  Text,
  Box,
  Divider,
  Paper,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import type { Department } from '@/api/departments.api'

// ─── Brand palette ─────────────────────────────────────────────────────────────

const BRAND = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleLight: '#EEEDFE',
  purpleText:  '#3C3489',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
  redText:     '#791F1F',
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DepartmentFormProps {
  opened: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description?: string }) => Promise<void>
  initialData?: Department
  isLoading?: boolean
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DepartmentForm({
  opened,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: DepartmentFormProps) {
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors]           = useState<Record<string, string>>({})

  const resetForm = useCallback(() => {
    if (initialData) {
      setName(initialData.name)
      setDescription(initialData.description || '')
    } else {
      setName('')
      setDescription('')
    }
    setErrors({})
  }, [initialData])

  useEffect(() => {
    if (opened) resetForm()
  }, [opened, resetForm])

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Department name is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined })
      onClose()
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save department' })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8}>
          <Icon
            icon={initialData ? 'solar:pen-2-bold-duotone' : 'solar:buildings-3-bold-duotone'}
            width={18}
            style={{ color: BRAND.purple }}
          />
          <Text fw={500} size="sm">
            {initialData ? 'Edit department' : 'New department'}
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
          label={<Text size="xs" fw={500} mb={4}>Department name</Text>}
          placeholder="e.g. Engineering, Customer Support…"
          value={name}
          onChange={(e) => { setName(e.currentTarget.value); setErrors((p) => ({ ...p, name: '' })) }}
          error={errors.name}
          disabled={isLoading}
          required
          styles={{ input: { fontSize: 13 } }}
        />

        {/* Description */}
        <Textarea
          label={<Text size="xs" fw={500} mb={4}>Description <Text span size="xs" c="dimmed">(optional)</Text></Text>}
          placeholder="Briefly describe what this department handles…"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
          disabled={isLoading}
          styles={{ input: { fontSize: 13 } }}
        />

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
            {initialData ? 'Save changes' : 'Create department'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
