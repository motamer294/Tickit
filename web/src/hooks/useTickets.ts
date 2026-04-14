/**
 * useTickets Hook
 * Manages ticket queries and mutations with React Query
 *
 * Features:
 * - Automatic caching and refetching
 * - Optimistic updates for mutations
 * - Error handling with user notifications
 * - Loading and error states
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTickets,
  fetchTicketById,
  createTicketApi,
  updateTicketStatusApi,
  addCommentApi,
  fetchTicketComments,
  fetchEmployeeTasks,
  assignTicketApi,
  fetchAnalyticsDashboard,
} from '@/api/tickets.api'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from './useAuth'
import { notifications } from '@mantine/notifications'
import { parseError, toNotificationPayload } from '@/utils/error-handling'
import type { TicketCreatePayload, TicketStatus } from '@/types/ticket'

// Use centralized query keys
const ticketKeys = queryKeys.tickets
const commentKeys = queryKeys.comments

/**
 * Hook: Fetch all tickets visible to current user
 * - CUSTOMER: sees own tickets
 * - EMPLOYEE: sees all (backend filtered)
 * - MANAGER: sees all
 */
export function useTickets() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ticketKeys.lists(),
    queryFn: () => fetchTickets(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  })
}

/**
 * Hook: Fetch a single ticket by ID
 */
export function useTicket(ticketId: number | undefined | null) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ticketId ? ticketKeys.detail(ticketId) : [],
    queryFn: () => fetchTicketById(ticketId!),
    enabled: isAuthenticated && !!ticketId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
  })
}

/**
 * Hook: Create a new ticket
 * Automatically invalidates ticket list on success
 */
export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TicketCreatePayload) => createTicketApi(data),
    onSuccess: (newTicket) => {
      // Invalidate and refetch ticket list
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })

      // Optionally add to cache immediately
      queryClient.setQueryData(ticketKeys.detail(newTicket.id), newTicket)

      notifications.show({
        title: 'Ticket created',
        message: 'Your support ticket has been created successfully',
        color: 'green',
        autoClose: 3000,
      })
    },
    onError: (error: any) => {
      const errorInfo = parseError(error)
      notifications.show(toNotificationPayload(errorInfo))
    },
  })
}

/**
 * Hook: Update ticket status
 * Supports optimistic updates
 */
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { ticketId: number; status: TicketStatus }) =>
      updateTicketStatusApi(params.ticketId, params.status),

    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ticketKeys.detail(params.ticketId),
      })

      // Snapshot current data
      const previousTicket = queryClient.getQueryData(
        ticketKeys.detail(params.ticketId),
      )

      // Optimistic update
      if (previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(params.ticketId), {
          ...previousTicket,
          status: params.status,
        })
      }

      return { previousTicket }
    },

    onSuccess: (_, { ticketId }) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })

      notifications.show({
        title: 'Status updated',
        message: 'Ticket status has been updated successfully',
        color: 'green',
        autoClose: 3000,
      })
    },

    onError: (error: any, _, context: any) => {
      // Revert optimistic update on error
      if (context?.previousTicket) {
        queryClient.setQueryData(
          ticketKeys.detail(context.previousTicket.id),
          context.previousTicket,
        )
      }

      const errorInfo = parseError(error)
      notifications.show(toNotificationPayload(errorInfo))
    },
  })
}

/**
 * Hook: Assign a ticket to an employee
 * MANAGER ONLY
 */
export function useAssignTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { ticketId: number; employeeId: number }) =>
      assignTicketApi(params.ticketId, params.employeeId),

    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })

      notifications.show({
        title: 'Ticket assigned',
        message: 'Ticket has been assigned to employee',
        color: 'green',
        autoClose: 3000,
      })
    },

    onError: (error: any) => {
      const errorInfo = parseError(error)
      notifications.show(toNotificationPayload(errorInfo))
    },
  })
}

/**
 * Hook: Add comment to ticket
 */
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { ticketId: number; text: string }) =>
      addCommentApi(params.ticketId, params.text),

    onSuccess: (_, { ticketId }) => {
      // Invalidate comments for this ticket
      queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId) })

      notifications.show({
        title: 'Comment added',
        message: 'Your comment has been posted',
        color: 'green',
        autoClose: 3000,
      })
    },

    onError: (error: any) => {
      const errorInfo = parseError(error)
      notifications.show(toNotificationPayload(errorInfo))
    },
  })
}

/**
 * Hook: Fetch comments for a ticket
 */
export function useTicketComments(ticketId: number | undefined | null) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ticketId ? commentKeys.list(ticketId) : [],
    queryFn: () => fetchTicketComments(ticketId!),
    enabled: isAuthenticated && !!ticketId,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5,
    retry: 2,
  })
}

/**
 * Hook: Fetch assigned tasks for employee
 * EMPLOYEE ONLY
 */
export function useEmployeeTasks() {
  const { isAuthenticated, isEmployee } = useAuth()

  return useQuery({
    queryKey: ticketKeys.tasks(),
    queryFn: () => fetchEmployeeTasks(),
    enabled: isAuthenticated && isEmployee,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
  })
}

/**
 * Hook: Fetch analytics dashboard
 * MANAGER ONLY
 */
export function useAnalyticsDashboard() {
  const { isAuthenticated, isManager } = useAuth()

  return useQuery({
    queryKey: ticketKeys.analytics(),
    queryFn: () => fetchAnalyticsDashboard(),
    enabled: isAuthenticated && isManager,
    staleTime: 1000 * 60 * 15, // 15 minutes - less frequent updates needed
    gcTime: 1000 * 60 * 30,
    retry: 1, // Single retry for analytics
  })
}
