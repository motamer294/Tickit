import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Container,
  Stack,
  Group,
  Text,
  Paper,
  Button,
  Modal,
  TextInput,
  Textarea,
  ColorPicker,
  LoadingOverlay,
  Center,
  ActionIcon,
  Tooltip,
  Box,
  Divider,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import { notifications } from '@mantine/notifications'
import {
  fetchCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '@/api/tickets.api'
import type { Category } from '@/types/ticket'

// ─── Brand palette (matches all other pages) ───────────────────────────────────

const BRAND = {
  purple:      '#7F77DD',
  purpleDark:  '#534AB7',
  purpleLight: '#EEEDFE',
  purpleText:  '#3C3489',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
  redText:     '#791F1F',
  amber:       '#EF9F27',
  amberLight:  '#FAEEDA',
  amberText:   '#633806',
  green:       '#639922',
  greenLight:  '#EAF3DE',
  greenText:   '#27500A',
  gray:        '#B4B2A9',
  grayLight:   '#F1EFE8',
  grayText:    '#444441',
}

const DEFAULT_FORM = { name: '', description: '', color: '#7F77DD' }

const TH_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--mantine-color-dimmed)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  paddingBottom: 10,
  whiteSpace: 'nowrap',
}

// ─── Suggested swatches ────────────────────────────────────────────────────────

const SWATCHES = [
  '#7F77DD', '#534AB7', '#E24B4A', '#EF9F27', '#639922',
  '#378ADD', '#0E9E8E', '#9C59D1', '#E87B23', '#1EA8BF',
  '#D04A8F', '#B4B2A9', '#2C7BE5', '#00B4A0', '#FF6B6B',
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string
  value: number
  icon: string
  accentColor: string
}) {
  return (
    <Paper
      radius="md"
      p="md"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <Group justify="space-between" mb={8}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: '0.05em' }}>
          {label}
        </Text>
        <Icon icon={icon} width={15} style={{ color: accentColor, opacity: 0.75 }} />
      </Group>
      <Text fw={500} style={{ fontSize: 28, lineHeight: 1 }}>{value}</Text>
      <Box
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 3, background: accentColor,
        }}
      />
    </Paper>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CategoryAdminPanel() {
  const queryClient = useQueryClient()

  const [opened, setOpened]                   = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData]               = useState(DEFAULT_FORM)
  const [searchQuery, setSearchQuery]         = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  // ── Queries ──
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategoriesApi,
  })

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (payload: typeof formData) => createCategoryApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ title: 'Category created', message: 'Category created successfully', color: 'green' })
      closeModal()
    },
    onError: (err) => notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to create category', color: 'red' }),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: typeof formData) => updateCategoryApi(editingCategory!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ title: 'Category updated', message: 'Category updated successfully', color: 'green' })
      closeModal()
    },
    onError: (err) => notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to update category', color: 'red' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategoryApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ title: 'Category deleted', message: 'Category deleted successfully', color: 'green' })
      setDeleteConfirmId(null)
    },
    onError: (err) => notifications.show({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to delete category', color: 'red' }),
  })

  // ── Handlers ──
  const closeModal = () => {
    setOpened(false)
    setEditingCategory(null)
    setFormData(DEFAULT_FORM)
  }

  const handleOpenNew = () => {
    setEditingCategory(null)
    setFormData(DEFAULT_FORM)
    setOpened(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({ name: category.name, description: category.description, color: category.color })
    setOpened(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      notifications.show({ title: 'Validation error', message: 'Category name is required', color: 'yellow' })
      return
    }
    if (editingCategory) updateMutation.mutate(formData)
    else createMutation.mutate(formData)
  }

  // ── Filtered list ──
  const displayCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter(
      (c: Category) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    )
  }, [categories, searchQuery])

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">

        {/* ── Header ── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Text fw={500} style={{ fontSize: 22, lineHeight: 1.2 }}>Categories</Text>
            <Text size="sm" c="dimmed" mt={2}>Manage ticket categories and their colors</Text>
          </Box>
          <Button
            size="sm"
            leftSection={<Icon icon="solar:add-circle-bold-duotone" width={15} />}
            style={{ background: BRAND.purpleDark, border: 'none' }}
            onClick={handleOpenNew}
          >
            New category
          </Button>
        </Group>

        {/* ── Stat cards ── */}
        <Group gap={10} wrap="nowrap">
          <StatCard
            label="Total categories"
            value={categories.length}
            icon="solar:folder-2-linear"
            accentColor={BRAND.purple}
          />
          <StatCard
            label="Shown"
            value={displayCategories.length}
            icon="solar:filter-linear"
            accentColor={BRAND.blue}
          />
        </Group>

        {/* ── Search + Table ── */}
        <Paper radius="md" style={{ border: '0.5px solid var(--mantine-color-default-border)', overflow: 'hidden' }}>

          {/* Toolbar */}
          <Box px="md" py="sm" style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
            <Group justify="space-between">
              <TextInput
                placeholder="Search categories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                leftSection={<Icon icon="solar:magnifer-linear" width={14} style={{ color: 'var(--mantine-color-dimmed)' }} />}
                rightSection={
                  searchQuery ? (
                    <ActionIcon variant="subtle" size="xs" onClick={() => setSearchQuery('')}>
                      <Icon icon="solar:close-circle-linear" width={13} />
                    </ActionIcon>
                  ) : null
                }
                style={{ width: 240 }}
                styles={{ input: { fontSize: 13, height: 34 } }}
              />
              <Text size="xs" c="dimmed">
                {displayCategories.length} of {categories.length} categories
              </Text>
            </Group>
          </Box>

          {/* Table */}
          {isLoading ? (
            <Center py={80}><Box style={{ position: 'relative', width: 40, height: 40 }}><LoadingOverlay visible /></Box></Center>
          ) : displayCategories.length === 0 ? (
            <Center py={80}>
              <Stack align="center" gap="sm">
                <Icon
                  icon="solar:folder-2-linear"
                  width={36}
                  style={{ color: 'var(--mantine-color-dimmed)', opacity: 0.4 }}
                />
                <Text size="sm" c="dimmed">
                  {searchQuery ? 'No categories match your search' : 'No categories yet'}
                </Text>
                {searchQuery ? (
                  <Button variant="subtle" size="xs" style={{ color: BRAND.purpleDark }} onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                ) : (
                  <Button variant="subtle" size="xs" style={{ color: BRAND.purpleDark }} onClick={handleOpenNew}>
                    Create first category
                  </Button>
                )}
              </Stack>
            </Center>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
                    <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Category</th>
                    <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Description</th>
                    <th style={{ ...TH_STYLE, padding: '10px 16px' }}>Color</th>
                    <th style={{ ...TH_STYLE, padding: '10px 16px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayCategories.map((category: Category, idx: number) => (
                    <tr
                      key={category.id}
                      style={{
                        borderBottom:
                          idx < displayCategories.length - 1
                            ? '0.5px solid var(--mantine-color-default-border)'
                            : 'none',
                        transition: 'background .12s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--mantine-color-default-hover)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                    >
                      {/* Name + color dot */}
                      <td style={{ padding: '10px 16px' }}>
                        <Group gap={10} wrap="nowrap">
                          <Box
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: category.color,
                              flexShrink: 0,
                              boxShadow: `0 0 0 2px ${category.color}33`,
                            }}
                          />
                          <Text size="sm" fw={500}>{category.name}</Text>
                        </Group>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '10px 16px', maxWidth: 320 }}>
                        <Text size="sm" c="dimmed" lineClamp={1}>
                          {category.description || '—'}
                        </Text>
                      </td>

                      {/* Color swatch + hex */}
                      <td style={{ padding: '10px 16px' }}>
                        <Group gap={8} wrap="nowrap">
                          <Box
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              background: category.color,
                              border: '0.5px solid rgba(0,0,0,0.1)',
                              flexShrink: 0,
                            }}
                          />
                          <Text size="xs" style={{ fontFamily: 'monospace', color: 'var(--mantine-color-dimmed)' }}>
                            {category.color}
                          </Text>
                        </Group>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 16px' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Edit category" withArrow fz={11} position="top">
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              style={{ color: BRAND.purpleDark }}
                              onClick={() => handleEdit(category)}
                            >
                              <Icon icon="solar:pen-2-linear" width={15} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete category" withArrow fz={11} position="top">
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              style={{ color: BRAND.red }}
                              onClick={() => { setDeleteConfirmId(category.id); setDeleteConfirmName(category.name) }}
                            >
                              <Icon icon="solar:trash-bin-2-linear" width={15} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}

          {/* Footer */}
          {displayCategories.length > 0 && (
            <Box
              px="md"
              py="sm"
              style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
            >
              <Text size="xs" c="dimmed">
                {displayCategories.length} categor{displayCategories.length === 1 ? 'y' : 'ies'}
                {searchQuery && ' · filtered'}
              </Text>
            </Box>
          )}
        </Paper>
      </Stack>

      {/* ── Create / Edit Modal ── */}
      <Modal
        opened={opened}
        onClose={closeModal}
        title={
          <Group gap={8}>
            <Icon
              icon={editingCategory ? 'solar:pen-2-bold-duotone' : 'solar:folder-2-bold-duotone'}
              width={18}
              style={{ color: formData.color || BRAND.purple }}
            />
            <Text fw={500} size="sm">
              {editingCategory ? 'Edit category' : 'New category'}
            </Text>
          </Group>
        }
        size="md"
        radius="md"
        styles={{
          header: { borderBottom: '0.5px solid var(--mantine-color-default-border)', paddingBottom: 12 },
          body:   { paddingTop: 16 },
        }}
      >
        <LoadingOverlay
          visible={createMutation.isPending || updateMutation.isPending}
          zIndex={1000}
          overlayProps={{ radius: 'sm', blur: 2 }}
        />

        <Stack gap="md">
          {/* Name */}
          <TextInput
            label={<Text size="xs" fw={500} mb={4}>Category name</Text>}
            placeholder="e.g. Billing, Technical Support…"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
            styles={{ input: { fontSize: 13 } }}
          />

          {/* Description */}
          <Textarea
            label={<Text size="xs" fw={500} mb={4}>Description</Text>}
            placeholder="Briefly describe what this category covers…"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
            rows={3}
            styles={{ input: { fontSize: 13 } }}
          />

          {/* Color */}
          <Box>
            <Text size="xs" fw={500} mb={8}>Color</Text>

            {/* Preview */}
            <Group gap={10} mb={12} align="center">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: formData.color,
                  border: '0.5px solid rgba(0,0,0,0.12)',
                  flexShrink: 0,
                }}
              />
              <Box>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: formData.color + '22',
                    color: formData.color,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: formData.color, display: 'inline-block' }} />
                  {formData.name || 'Preview'}
                </span>
              </Box>
              <Text size="xs" style={{ fontFamily: 'monospace', color: 'var(--mantine-color-dimmed)' }}>
                {formData.color}
              </Text>
            </Group>

            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
              swatches={SWATCHES}
              swatchesPerRow={8}
              format="hex"
              styles={{ swatch: { borderRadius: 4 } }}
            />

            {/* Manual hex input */}
            <TextInput
              mt={8}
              placeholder="#000000"
              value={formData.color}
              onChange={(e) => {
                const val = e.currentTarget.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setFormData({ ...formData, color: val })
              }}
              leftSection={
                <Box style={{ width: 14, height: 14, borderRadius: 3, background: formData.color, border: '0.5px solid rgba(0,0,0,0.15)' }} />
              }
              style={{ width: 140 }}
              styles={{ input: { fontSize: 12, fontFamily: 'monospace', height: 32 } }}
            />
          </Box>

          <Divider />

          {/* Actions */}
          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: formData.color, border: 'none' }}
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSave}
            >
              {editingCategory ? 'Save changes' : 'Create category'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        opened={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title={
          <Group gap={8}>
            <Icon icon="solar:danger-triangle-bold-duotone" width={18} style={{ color: BRAND.red }} />
            <Text fw={500} size="sm">Confirm deletion</Text>
          </Group>
        }
        size="sm"
        centered
        radius="md"
        styles={{
          header: { borderBottom: '0.5px solid var(--mantine-color-default-border)', paddingBottom: 12 },
          body:   { paddingTop: 16 },
        }}
      >
        <Stack gap="lg">
          <Paper
            p="md"
            radius="md"
            style={{ background: BRAND.redLight, border: `0.5px solid ${BRAND.red}33` }}
          >
            <Group gap={8} align="flex-start">
              <Icon icon="solar:info-circle-linear" width={15} style={{ color: BRAND.red, marginTop: 1, flexShrink: 0 }} />
              <Text size="sm" style={{ color: BRAND.redText }}>
                You are about to delete the category{' '}
                <strong>"{deleteConfirmName}"</strong>. Tickets using this category will lose their category assignment. This cannot be undone.
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              style={{ background: BRAND.red, border: 'none' }}
              loading={deleteMutation.isPending}
              onClick={() => { if (deleteConfirmId !== null) deleteMutation.mutate(deleteConfirmId) }}
            >
              Delete category
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
