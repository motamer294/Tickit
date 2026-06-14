/**
 * Departments & Teams API Client
 * API endpoints for managing departments, teams, and team members
 */

import { getAxiosInstance, APIError } from './config'
import { logger } from '@/utils/logger'

// ============================================
// Types
// ============================================

export interface Department {
  id: number
  name: string
  description: string
  manager_id?: number
  teams?: Team[]
  team_count?: number
  created_at?: string
  updated_at?: string
}

export interface Team {
  id: number
  name: string
  description: string
  department_id: number
  team_lead_id?: number
  members?: User[]
  employee_count?: number
  created_at?: string
  updated_at?: string
}

export interface User {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  role?: string
  team_id?: number
  team?: Team
  department_id?: number
}

export interface DepartmentDetail extends Department {
  teams: Team[]
}

export interface TeamDetail extends Team {
  members: User[]
}

export interface EmployeeWithTeam extends User {
  team?: Team
  department?: Department
}

// ============================================
// Department Operations
// ============================================

/**
 * Fetch all departments
 * MANAGER ONLY
 */
export async function fetchDepartmentsApi(): Promise<Department[]> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<Department[]>('/departments')
    return response.data || []
  } catch (error: unknown) {
    logger.error('Failed to fetch departments:', error)
    return []
  }
}

/**
 * Fetch a single department with teams
 * MANAGER ONLY
 */
export async function fetchDepartmentDetailApi(
  departmentId: number,
): Promise<DepartmentDetail> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<DepartmentDetail>(
      `/departments/${departmentId}`,
    )
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Department not found')
      }
    }
    throw error
  }
}

/**
 * Create a new department
 * MANAGER ONLY
 */
export async function createDepartmentApi(payload: {
  name: string
  description?: string
  manager_id?: number
}): Promise<Department> {
  try {
    const client = getAxiosInstance()
    const response = await client.post<Department>('/departments', payload)
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 400) {
        throw new Error('Invalid department data')
      }
    }
    throw error
  }
}

/**
 * Update a department
 * MANAGER ONLY
 */
export async function updateDepartmentApi(
  departmentId: number,
  payload: Partial<Department>,
): Promise<Department> {
  try {
    const client = getAxiosInstance()
    const response = await client.patch<Department>(
      `/departments/${departmentId}`,
      payload,
    )
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Department not found')
      }
    }
    throw error
  }
}

/**
 * Delete a department
 * MANAGER ONLY
 */
export async function deleteDepartmentApi(departmentId: number): Promise<void> {
  try {
    const client = getAxiosInstance()
    await client.delete(`/departments/${departmentId}`)
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Department not found')
      }
    }
    throw error
  }
}

// ============================================
// Team Operations
// ============================================

/**
 * Fetch all teams, optionally filtered by department
 * MANAGER ONLY
 */
export async function fetchTeamsApi(
  departmentId?: number,
): Promise<Team[]> {
  try {
    const client = getAxiosInstance()
    const params = departmentId ? { department_id: departmentId } : {}
    const response = await client.get<Team[]>('/teams', { params })
    return response.data || []
  } catch (error: unknown) {
    logger.error('Failed to fetch teams:', error)
    return []
  }
}

/**
 * Fetch a single team with members
 * MANAGER ONLY
 */
export async function fetchTeamDetailApi(teamId: number): Promise<TeamDetail> {
  try {
    const client = getAxiosInstance()
    const response = await client.get<TeamDetail>(`/teams/${teamId}`)
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Team not found')
      }
    }
    throw error
  }
}

/**
 * Create a new team
 * MANAGER ONLY
 */
export async function createTeamApi(payload: {
  name: string
  description?: string
  department_id: number
  team_lead_id?: number
}): Promise<Team> {
  try {
    const client = getAxiosInstance()
    const response = await client.post<Team>('/teams', payload)
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 400) {
        throw new Error('Invalid team data')
      }
    }
    throw error
  }
}

/**
 * Update a team
 * MANAGER ONLY
 */
export async function updateTeamApi(
  teamId: number,
  payload: Partial<Team>,
): Promise<Team> {
  try {
    const client = getAxiosInstance()
    const response = await client.patch<Team>(`/teams/${teamId}`, payload)
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Team not found')
      }
    }
    throw error
  }
}

/**
 * Delete a team
 * MANAGER ONLY
 */
export async function deleteTeamApi(teamId: number): Promise<void> {
  try {
    const client = getAxiosInstance()
    await client.delete(`/teams/${teamId}`)
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Team not found')
      }
    }
    throw error
  }
}

/**
 * Add a member to a team
 * MANAGER ONLY
 */
export async function addTeamMemberApi(
  teamId: number,
  userId: number,
): Promise<Team> {
  try {
    const client = getAxiosInstance()
    const response = await client.post<Team>(
      `/teams/${teamId}/add-member/${userId}`,
      {},
    )
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Team or user not found')
      }
    }
    throw error
  }
}

/**
 * Remove a member from a team
 * MANAGER ONLY
 */
export async function removeTeamMemberApi(
  teamId: number,
  userId: number,
): Promise<Team> {
  try {
    const client = getAxiosInstance()
    const response = await client.delete<Team>(
      `/teams/${teamId}/remove-member/${userId}`,
    )
    return response.data
  } catch (error: unknown) {
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        throw new Error('Team or user not found')
      }
    }
    throw error
  }
}

// ============================================
// Employee Operations with Team Info
// ============================================

/**
 * Fetch all employees with team and department information
 * Optionally filter by team_id or department_id
 */
export async function fetchEmployeesWithTeamApi(filters?: {
  team_id?: number
  department_id?: number
  role?: string
}): Promise<EmployeeWithTeam[]> {
  try {
    const client = getAxiosInstance()
    const params = filters || {}
    logger.debug('Fetching employees with params:', params)
    const response = await client.get<EmployeeWithTeam[]>('/employees', {
      params,
    })
    logger.debug('Employees fetched:', Array.isArray(response.data) ? response.data.length : 'N/A', 'records')
    return response.data || []
  } catch (error: unknown) {
    logger.error('Failed to fetch employees with team info:', error)
    return []
  }
}

/**
 * Group employees by department and team for dropdown display
 */
export function groupEmployeesByTeam(
  employees: EmployeeWithTeam[],
): Map<string, Map<string, EmployeeWithTeam[]>> {
  const grouped = new Map<string, Map<string, EmployeeWithTeam[]>>()

  for (const employee of employees) {
    const deptName = employee.department?.name || 'Unassigned'
    const teamName = employee.team?.name || 'Unassigned'

    if (!grouped.has(deptName)) {
      grouped.set(deptName, new Map())
    }

    const deptTeams = grouped.get(deptName)!
    if (!deptTeams.has(teamName)) {
      deptTeams.set(teamName, [])
    }

    deptTeams.get(teamName)!.push(employee)
  }

  return grouped
}

/**
 * Group employees by team only (for simple dropdowns)
 * Returns grouped data structure for Mantine Select component
 */
export function groupEmployeesByTeamOnly(
  employees: EmployeeWithTeam[],
): Array<{
  group: string
  items: Array<{ value: string; label: string }>
}> {
  logger.debug('groupEmployeesByTeamOnly called with:', employees.length, 'employees')

  const grouped = new Map<string, EmployeeWithTeam[]>()

  for (const employee of employees) {
    const teamName = employee.team?.name || 'Unassigned'
    logger.debug(`Employee: ${employee.username}, Team: ${teamName}`)

    if (!grouped.has(teamName)) {
      grouped.set(teamName, [])
    }

    grouped.get(teamName)!.push(employee)
  }

  const result = Array.from(grouped.entries()).map(([teamName, emps]) => ({
    group: teamName,
    items: emps.map((emp) => ({
      value: emp.id.toString(),
      label: emp.first_name
        ? `${emp.first_name} ${emp.last_name || ''}`.trim()
        : emp.username,
    })),
  }))

  logger.debug('Grouped result:', result)

  return result
}

/**
 * Format employee name with team info for display
 */
export function formatEmployeeName(employee: EmployeeWithTeam): string {
  const name = employee.first_name
    ? `${employee.first_name} ${employee.last_name || ''}`.trim()
    : employee.username

  if (employee.team?.name) {
    return `${name} (${employee.team.name})`
  }

  return name
}
