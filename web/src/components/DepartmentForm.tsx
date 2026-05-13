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
} from '@mantine/core'
import type { Department } from '@/api/departments.api'

interface DepartmentFormProps {
  opened: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description?: string }) => Promise<void>
  initialData?: Department
  isLoading?: boolean
}

export function DepartmentForm({
  opened,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: DepartmentFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (opened) {
      resetForm()
    }
  }, [opened, resetForm])

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Department name is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      onClose()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save department',
      })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialData ? 'Edit Department' : 'Create Department'}
      centered
    >
      <Stack gap="md" pos="relative">
        <LoadingOverlay visible={isLoading} />

        <TextInput
          label="Department Name"
          placeholder="e.g., Engineering"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={errors.name}
          disabled={isLoading}
          required
        />

        <Textarea
          label="Description"
          placeholder="Brief description of the department"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
          disabled={isLoading}
        />

        {errors.submit && (
          <div style={{ color: 'var(--mantine-color-red-6)', fontSize: '0.875rem' }}>
            {errors.submit}
          </div>
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
