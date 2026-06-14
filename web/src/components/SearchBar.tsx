import { useState } from 'react'
import {
  Stack,
  Group,
  TextInput,
  Select,
  MultiSelect,
  Button,
  Grid,
  ActionIcon,
  Collapse,
  Box,
  Text,
  Divider,
} from '@mantine/core'
import { useDebouncedCallback } from '@mantine/hooks'
import { Icon } from '@iconify-icon/react'
import type { SearchFilters } from '@/api/tickets.api'
import type { Employee } from '@/api/tickets.api'
import type { Category, Tag } from '@/types/ticket'

// ─── Brand palette ─────────────────────────────────────────────────────────────

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
  blue:        '#378ADD',
  blueLight:   '#E6F1FB',
  blueText:    '#0C447C',
}

// Status / priority color lookups for active filter pills
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  OPEN:        { bg: BRAND.redLight,   text: BRAND.redText,   dot: BRAND.red   },
  PENDING:     { bg: BRAND.blueLight,  text: BRAND.blueText,  dot: BRAND.blue  },
  IN_PROGRESS: { bg: BRAND.amberLight, text: BRAND.amberText, dot: BRAND.amber },
  RESOLVED:    { bg: BRAND.greenLight, text: BRAND.greenText, dot: BRAND.green },
  CLOSED:      { bg: BRAND.grayLight,  text: BRAND.grayText,  dot: BRAND.gray  },
}
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open', PENDING: 'Pending', IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved', CLOSED: 'Closed',
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  LOW:    { bg: BRAND.greenLight, text: BRAND.greenText, dot: BRAND.green },
  MEDIUM: { bg: BRAND.amberLight, text: BRAND.amberText, dot: BRAND.amber },
  HIGH:   { bg: BRAND.redLight,   text: BRAND.redText,   dot: BRAND.red   },
  URGENT: { bg: BRAND.redLight,   text: BRAND.redText,   dot: BRAND.red   },
}

// ─── Select options ────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { label: 'Low',    value: 'LOW'    },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High',   value: 'HIGH'   },
  { label: 'Urgent', value: 'URGENT' },
]

const STATUS_OPTIONS = [
  { label: 'Open',        value: 'OPEN'        },
  { label: 'Pending',     value: 'PENDING'     },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved',    value: 'RESOLVED'    },
  { label: 'Closed',      value: 'CLOSED'      },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Removable active-filter pill */
function FilterPill({
  label,
  bg,
  text,
  dot,
  onRemove,
}: {
  label: string
  bg: string
  text: string
  dot: string
  onRemove: () => void
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        padding: '3px 8px 3px 9px',
        borderRadius: 20,
        background: bg,
        color: text,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {label}
      <button
        onClick={onRemove}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.08)',
          color: text,
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <Icon icon="solar:close-circle-bold" width={10} />
      </button>
    </span>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void
  employees?: Employee[]
  categories?: Category[]
  tags?: Tag[]
  isLoading?: boolean
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SearchBar({
  onSearch,
  employees = [],
  categories = [],
  tags = [],
  isLoading = false,
}: SearchBarProps) {
  const [expanded, setExpanded]       = useState(false)
  const [filters, setFilters]         = useState<SearchFilters>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const hasActiveFilters = Boolean(
    filters.query || filters.status || filters.priority ||
    filters.category_id || selectedTags.length > 0 ||
    filters.assigned_to_id || filters.created_from || filters.created_to,
  )

  const activeCount = [
    filters.status, filters.priority, filters.category_id,
    selectedTags.length > 0 ? 'tags' : null,
    filters.assigned_to_id, filters.created_from, filters.created_to,
  ].filter(Boolean).length

  const buildPayload = (overrides?: Partial<SearchFilters>): SearchFilters => ({
    ...filters,
    ...overrides,
    ...(selectedTags.length > 0 && { tag_ids: selectedTags.join(',') }),
  })

  const handleSearch = () => onSearch(buildPayload())

  const debouncedSearch = useDebouncedCallback(
    (patch: Partial<SearchFilters>) => onSearch(buildPayload(patch)),
    350,
  )

  const handleClear = () => {
    setFilters({})
    setSelectedTags([])
    onSearch({})
  }

  const update = (patch: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    debouncedSearch(patch)
  }

  const categoryOptions  = categories.map((c) => ({ label: c.name,          value: c.id.toString() }))
  const tagOptions       = tags.map((t)       => ({ label: `#${t.name}`,     value: t.id.toString() }))
  const employeeOptions  = employees.map((e)  => ({ label: e.username,        value: e.id.toString() }))

  const assignedEmployee = filters.assigned_to_id
    ? employees.find((e) => e.id.toString() === filters.assigned_to_id?.toString())
    : null

  const selectedCategory = filters.category_id
    ? categories.find((c) => c.id === filters.category_id)
    : null

  return (
    <Stack gap="sm">
      {/* ── Main search row ── */}
      <Group gap={8} wrap="nowrap">
        <TextInput
          placeholder="Search by title or description…"
          value={filters.query || ''}
          onChange={(e) => update({ query: e.currentTarget.value || undefined })}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
          disabled={isLoading}
          leftSection={<Icon icon="solar:magnifer-linear" width={14} style={{ color: 'var(--mantine-color-dimmed)' }} />}
          rightSection={
            filters.query ? (
              <ActionIcon variant="subtle" size="xs" onClick={() => update({ query: undefined })}>
                <Icon icon="solar:close-circle-linear" width={13} />
              </ActionIcon>
            ) : null
          }
          style={{ flex: 1 }}
          styles={{ input: { fontSize: 13, height: 36 } }}
        />

        <Button
          size="sm"
          style={{ background: BRAND.purpleDark, border: 'none', flexShrink: 0 }}
          loading={isLoading}
          leftSection={<Icon icon="solar:magnifer-linear" width={14} />}
          onClick={handleSearch}
        >
          Search
        </Button>

        <Button
          variant="default"
          size="sm"
          leftSection={<Icon icon="solar:filter-linear" width={14} />}
          rightSection={
            activeCount > 0 ? (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: BRAND.purpleLight,
                  color: BRAND.purpleText,
                }}
              >
                {activeCount}
              </span>
            ) : (
              <Icon
                icon={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                width={11}
              />
            )
          }
          onClick={() => setExpanded((o) => !o)}
          style={{ flexShrink: 0 }}
        >
          Filters
        </Button>
      </Group>

      {/* ── Active filter pills ── */}
      {hasActiveFilters && (
        <Group gap={6} wrap="wrap" align="center">
          <Text size="xs" c="dimmed" fw={500}>Active:</Text>

          {filters.status && (
            <FilterPill
              label={`Status · ${STATUS_LABELS[filters.status] ?? filters.status}`}
              {...(STATUS_COLORS[filters.status] ?? { bg: BRAND.grayLight, text: BRAND.grayText, dot: BRAND.gray })}
              onRemove={() => update({ status: undefined })}
            />
          )}

          {filters.priority && (
            <FilterPill
              label={`Priority · ${filters.priority.charAt(0) + filters.priority.slice(1).toLowerCase()}`}
              {...(PRIORITY_COLORS[filters.priority] ?? { bg: BRAND.grayLight, text: BRAND.grayText, dot: BRAND.gray })}
              onRemove={() => update({ priority: undefined })}
            />
          )}

          {selectedCategory && (
            <FilterPill
              label={`Category · ${selectedCategory.name}`}
              bg={selectedCategory.color + '22'}
              text={selectedCategory.color}
              dot={selectedCategory.color}
              onRemove={() => update({ category_id: undefined })}
            />
          )}

          {selectedTags.length > 0 && (
            <FilterPill
              label={`Tags · ${selectedTags.length}`}
              bg={BRAND.purpleLight}
              text={BRAND.purpleText}
              dot={BRAND.purple}
              onRemove={() => setSelectedTags([])}
            />
          )}

          {assignedEmployee && (
            <FilterPill
              label={`Assignee · ${assignedEmployee.username}`}
              bg={BRAND.blueLight}
              text={BRAND.blueText}
              dot={BRAND.blue}
              onRemove={() => update({ assigned_to_id: undefined })}
            />
          )}

          {filters.created_from && (
            <FilterPill
              label={`From · ${filters.created_from}`}
              bg={BRAND.grayLight}
              text={BRAND.grayText}
              dot={BRAND.gray}
              onRemove={() => update({ created_from: undefined })}
            />
          )}

          {filters.created_to && (
            <FilterPill
              label={`To · ${filters.created_to}`}
              bg={BRAND.grayLight}
              text={BRAND.grayText}
              dot={BRAND.gray}
              onRemove={() => update({ created_to: undefined })}
            />
          )}

          <button
            onClick={handleClear}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
              padding: '3px 9px',
              borderRadius: 20,
              border: '1px solid var(--mantine-color-default-border)',
              background: 'transparent',
              color: 'var(--mantine-color-dimmed)',
              cursor: 'pointer',
            }}
          >
            <Icon icon="solar:close-circle-linear" width={11} />
            Clear all
          </button>
        </Group>
      )}

      {/* ── Advanced filters panel ── */}
      <Collapse in={expanded}>
        <Box
          p="md"
          style={{
            borderRadius: 'var(--mantine-radius-md)',
            border: '0.5px solid var(--mantine-color-default-border)',
            marginTop: 4,
          }}
        >
          <Text size="xs" tt="uppercase" fw={500} c="dimmed" mb="md" style={{ letterSpacing: '0.05em' }}>
            Advanced filters
          </Text>

          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label={<Text size="xs" fw={500} mb={4}>Status</Text>}
                placeholder="Any status"
                data={STATUS_OPTIONS}
                value={filters.status || null}
                onChange={(val) => update({ status: val || undefined })}
                clearable
                disabled={isLoading}
                styles={{ input: { fontSize: 13 } }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label={<Text size="xs" fw={500} mb={4}>Priority</Text>}
                placeholder="Any priority"
                data={PRIORITY_OPTIONS}
                value={filters.priority || null}
                onChange={(val) => update({ priority: val || undefined })}
                clearable
                disabled={isLoading}
                styles={{ input: { fontSize: 13 } }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label={<Text size="xs" fw={500} mb={4}>Category</Text>}
                placeholder="Any category"
                data={categoryOptions}
                value={filters.category_id?.toString() || null}
                onChange={(val) => update({ category_id: val ? parseInt(val) : undefined })}
                clearable
                disabled={isLoading}
                styles={{ input: { fontSize: 13 } }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MultiSelect
                label={<Text size="xs" fw={500} mb={4}>Tags</Text>}
                placeholder="Any tags"
                data={tagOptions}
                value={selectedTags}
                onChange={setSelectedTags}
                clearable
                disabled={isLoading}
                styles={{ input: { fontSize: 13 } }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label={<Text size="xs" fw={500} mb={4}>Assigned to</Text>}
                placeholder="Anyone"
                data={employeeOptions}
                value={filters.assigned_to_id?.toString() || null}
                onChange={(val) => update({ assigned_to_id: val ? parseInt(val) : undefined })}
                clearable
                disabled={isLoading}
                searchable
                styles={{ input: { fontSize: 13 } }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 3 }}>
              <TextInput
                label={<Text size="xs" fw={500} mb={4}>Created from</Text>}
                type="date"
                value={filters.created_from || ''}
                onChange={(e) => update({ created_from: e.currentTarget.value || undefined })}
                disabled={isLoading}
                styles={{ input: { fontSize: 13 } }}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 3 }}>
              <TextInput
                label={<Text size="xs" fw={500} mb={4}>Created to</Text>}
                type="date"
                value={filters.created_to || ''}
                onChange={(e) => update({ created_to: e.currentTarget.value || undefined })}
                disabled={isLoading}
                styles={{ input: { fontSize: 13 } }}
              />
            </Grid.Col>
          </Grid>

          <Divider my="md" />

          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed">
              {activeCount > 0
                ? `${activeCount} filter${activeCount !== 1 ? 's' : ''} active`
                : 'No filters applied'}
            </Text>
            <Group gap={8}>
              <Button
                variant="default"
                size="sm"
                onClick={handleClear}
                disabled={isLoading || !hasActiveFilters}
                leftSection={<Icon icon="solar:close-circle-linear" width={13} />}
              >
                Clear all
              </Button>
              <Button
                size="sm"
                style={{ background: BRAND.purpleDark, border: 'none' }}
                onClick={() => { handleSearch(); setExpanded(false) }}
                loading={isLoading}
                leftSection={<Icon icon="solar:magnifer-linear" width={13} />}
              >
                Apply filters
              </Button>
            </Group>
          </Group>
        </Box>
      </Collapse>
    </Stack>
  )
}
