import { useState } from 'react'
import {
  Stack,
  Group,
  TextInput,
  Select,
  MultiSelect,
  Button,
  Card,
  Badge,
  Grid,
  ActionIcon,
  Collapse,
} from '@mantine/core'
import { Icon } from '@iconify-icon/react'
import type { SearchFilters } from '@/api/tickets.api'
import type { Employee } from '@/api/tickets.api'
import type { Category, Tag } from '@/types/ticket'

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void
  employees?: Employee[]
  categories?: Category[]
  tags?: Tag[]
  isLoading?: boolean
}

const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
]

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]

export function SearchBar({
  onSearch,
  employees = [],
  categories = [],
  tags = [],
  isLoading = false,
}: SearchBarProps) {
  const [expanded, setExpanded] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const hasActiveFilters = Boolean(
    filters.query ||
    filters.status ||
    filters.priority ||
    filters.category_id ||
    selectedTags.length > 0 ||
    filters.assigned_to_id ||
    filters.created_from ||
    filters.created_to
  )

  const handleSearch = () => {
    const filtersToApply = {
      ...filters,
      ...(selectedTags.length > 0 && { tag_ids: selectedTags.join(',') }),
    }
    onSearch(filtersToApply)
  }

  const handleClear = () => {
    setFilters({})
    setSelectedTags([])
    onSearch({})
  }

  const categoryOptions = categories.map((cat) => ({
    label: cat.name,
    value: cat.id.toString(),
  }))

  const tagOptions = tags.map((tag) => ({
    label: `#${tag.name}`,
    value: tag.id.toString(),
  }))

  const employeeOptions = employees.map((emp) => ({
    label: emp.username,
    value: emp.id.toString(),
  }))

  return (
    <Card withBorder p="md" radius="md" mb="lg">
      <Stack gap="md">
        {/* Main Search Row */}
        <Group grow>
          <TextInput
            placeholder="Search by title or description..."
            leftSection={<Icon icon="solar:magnifer-bold-duotone" width={18} />}
            value={filters.query || ''}
            onChange={(e) =>
              setFilters({ ...filters, query: e.currentTarget.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
            disabled={isLoading}
          />
          <Button
            onClick={handleSearch}
            loading={isLoading}
            leftSection={<Icon icon="solar:magnifer-bold-duotone" width={18} />}
          >
            Search
          </Button>
          <Button
            variant="subtle"
            onClick={() => setExpanded(!expanded)}
            loading={isLoading}
            leftSection={<Icon icon={expanded ? 'solar:chevron-up-bold-duotone' : 'solar:chevron-down-bold-duotone'} width={18} />}
          >
            {expanded ? 'Hide' : 'Filter'}
          </Button>
        </Group>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Group gap="xs" wrap="wrap">
            {filters.status && (
              <Badge
                leftSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() =>
                      setFilters({ ...filters, status: undefined })
                    }
                  >
                    <Icon icon="solar:close-circle-bold-duotone" width={14} />
                  </ActionIcon>
                }
              >
                Status: {filters.status}
              </Badge>
            )}
            {filters.priority && (
              <Badge
                leftSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() =>
                      setFilters({ ...filters, priority: undefined })
                    }
                  >
                    <Icon icon="solar:close-circle-bold-duotone" width={14} />
                  </ActionIcon>
                }
              >
                Priority: {filters.priority}
              </Badge>
            )}
            {filters.category_id && (
              <Badge
                leftSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() =>
                      setFilters({ ...filters, category_id: undefined })
                    }
                  >
                    <Icon icon="solar:close-circle-bold-duotone" width={14} />
                  </ActionIcon>
                }
              >
                Category:{' '}
                {categories.find((c) => c.id === filters.category_id)?.name}
              </Badge>
            )}
            {selectedTags.length > 0 && (
              <Badge
                leftSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() => setSelectedTags([])}
                  >
                    <Icon icon="solar:close-circle-bold-duotone" width={14} />
                  </ActionIcon>
                }
              >
                Tags: {selectedTags.length}
              </Badge>
            )}
            {filters.assigned_to_id && (
              <Badge
                leftSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={() =>
                      setFilters({ ...filters, assigned_to_id: undefined })
                    }
                  >
                    <Icon icon="solar:close-circle-bold-duotone" width={14} />
                  </ActionIcon>
                }
              >
                Assigned:{' '}
                {employees.find((e) => e.id.toString() === filters.assigned_to_id?.toString())?.username}
              </Badge>
            )}
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={handleClear}
              leftSection={<Icon icon="solar:close-circle-bold-duotone" width={14} />}
            >
              Clear All
            </Button>
          </Group>
        )}

        {/* Advanced Filters */}
        <Collapse in={expanded}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Status"
                placeholder="Filter by status"
                data={statusOptions}
                value={filters.status || null}
                onChange={(val) =>
                  setFilters({ ...filters, status: val || undefined })
                }
                clearable
                disabled={isLoading}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Priority"
                placeholder="Filter by priority"
                data={priorityOptions}
                value={filters.priority || null}
                onChange={(val) =>
                  setFilters({ ...filters, priority: val || undefined })
                }
                clearable
                disabled={isLoading}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Category"
                placeholder="Filter by category"
                data={categoryOptions}
                value={filters.category_id?.toString() || null}
                onChange={(val) =>
                  setFilters({
                    ...filters,
                    category_id: val ? parseInt(val) : undefined,
                  })
                }
                clearable
                disabled={isLoading}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MultiSelect
                label="Tags"
                placeholder="Filter by tags"
                data={tagOptions}
                value={selectedTags}
                onChange={setSelectedTags}
                clearable
                disabled={isLoading}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Assigned To"
                placeholder="Filter by assignee"
                data={employeeOptions}
                value={filters.assigned_to_id?.toString() || null}
                onChange={(val) =>
                  setFilters({
                    ...filters,
                    assigned_to_id: val ? parseInt(val) : undefined,
                  })
                }
                clearable
                disabled={isLoading}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Created From"
                type="date"
                value={filters.created_from || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    created_from: e.currentTarget.value || undefined,
                  })
                }
                disabled={isLoading}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Created To"
                type="date"
                value={filters.created_to || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    created_to: e.currentTarget.value || undefined,
                  })
                }
                disabled={isLoading}
              />
            </Grid.Col>
          </Grid>

          <Group mt="md" justify="flex-end">
            <Button variant="outline" onClick={handleClear} disabled={isLoading}>
              Clear All Filters
            </Button>
            <Button onClick={handleSearch} loading={isLoading}>
              Apply Filters
            </Button>
          </Group>
        </Collapse>
      </Stack>
    </Card>
  )
}
