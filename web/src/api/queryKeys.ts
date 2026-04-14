/**
 * Centralized Query Key Factory
 * Ensures consistent query key structure across the entire application
 * Reference: https://tkdodo.de/blog/effective-react-query-keys
 */

export const queryKeys = {
  // ============ AUTHENTICATION ============
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    profile: (userId: number) => [...queryKeys.auth.all, 'profile', userId] as const,
  },

  // ============ TICKETS ============
  tickets: {
    all: ['tickets'] as const,
    lists: () => [...queryKeys.tickets.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.tickets.lists(), { filters }] as const,
    details: () => [...queryKeys.tickets.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.tickets.details(), id] as const,
    tasks: () => [...queryKeys.tickets.all, 'tasks'] as const,
    myTickets: () => [...queryKeys.tickets.all, 'my'] as const,
    analytics: () => [...queryKeys.tickets.all, 'analytics'] as const,
  },

  // ============ COMMENTS ============
  comments: {
    all: ['comments'] as const,
    lists: () => [...queryKeys.comments.all, 'list'] as const,
    list: (ticketId: number) => [...queryKeys.comments.lists(), ticketId] as const,
    details: () => [...queryKeys.comments.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.comments.details(), id] as const,
  },

  // ============ USERS & EMPLOYEES ============
  users: {
    all: ['users'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
    employees: () => [...queryKeys.users.all, 'employees'] as const,
    managers: () => [...queryKeys.users.all, 'managers'] as const,
  },

  // ============ DASHBOARD ============
  dashboard: {
    all: ['dashboard'] as const,
    analytics: () => [...queryKeys.dashboard.all, 'analytics'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },

  // ============ NOTIFICATIONS ============
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },

  // ============ REAL-TIME ============
  realtime: {
    all: ['realtime'] as const,
    updates: () => [...queryKeys.realtime.all, 'updates'] as const,
    data: (type: string) => [...queryKeys.realtime.all, 'data', type] as const,
  },
} as const;
