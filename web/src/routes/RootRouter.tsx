import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import DashboardLayout from '@/layouts/DashboardLayout'
import ProtectedRoute from './ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/useAuth'

/* Lazy page imports */
const Dashboard          = lazy(() => import('@/pages/dashboard/Dashboard'))
const TicketsList        = lazy(() => import('@/pages/tickets/TicketsList'))
const CreateTicket       = lazy(() => import('@/pages/tickets/CreateTicket'))
const TicketDetail       = lazy(() => import('@/pages/tickets/TicketDetail'))
const UserProfile        = lazy(() => import('@/pages/profile/UserProfile').then(m => ({ default: m.UserProfile })))
const Settings           = lazy(() => import('@/pages/settings/Settings'))
const UserAdminPanel     = lazy(() => import('@/pages/admin/UserAdminPanel'))
const SLAManagement      = lazy(() => import('@/pages/admin/SLAManagement'))
const AuditLogViewer     = lazy(() => import('@/pages/admin/AuditLogViewer'))
const CategoryAdminPanel = lazy(() => import('@/pages/admin/CategoryAdminPanel'))
const TagAdminPanel      = lazy(() => import('@/pages/admin/TagAdminPanel'))
const TeamManagementPanel = lazy(() => import('@/pages/admin/TeamManagementPanel'))
const Login              = lazy(() => import('@/pages/auth/Login'))
const Signup             = lazy(() => import('@/pages/auth/Signup'))
const Debug              = lazy(() => import('@/pages/Debug'))
const AuthLayout         = lazy(() => import('@/layouts/AuthLayout'))

function PageLoader() {
  return (
    <Center h="60vh">
      <Loader color="#7F77DD" size="sm" />
    </Center>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export default function RootRouter() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* ================= ROOT DECISION ================= */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/app" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ================= AUTH (PUBLIC) ================= */}
      <Route element={
        <Suspense fallback={<PageLoader />}>
          {/* AuthLayout is small, eager load is fine */}
          <AuthLayout />
        </Suspense>
      }>
        <Route path="/login"  element={<Page><Login /></Page>} />
        <Route path="/signup" element={<Page><Signup /></Page>} />
      </Route>

      {/* ================= APP (PROTECTED) ================= */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<Page><Dashboard /></Page>} />
        <Route path="profile"   element={<Page><UserProfile /></Page>} />
        <Route path="settings"  element={<Page><Settings /></Page>} />

        <Route
          path="debug"
          element={
            <ProtectedRoute requiredRoles={['MANAGER']}>
              <Page><Debug /></Page>
            </ProtectedRoute>
          }
        />

        {/* ── Admin ── */}
        <Route
          path="admin"
          element={
            <ProtectedRoute requiredRoles={['MANAGER']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users"       element={<Page><UserAdminPanel /></Page>} />
          <Route path="teams"       element={<Page><TeamManagementPanel /></Page>} />
          <Route path="categories"  element={<Page><CategoryAdminPanel /></Page>} />
          <Route path="tags"        element={<Page><TagAdminPanel /></Page>} />
          <Route path="slas"        element={<Page><SLAManagement /></Page>} />
          <Route path="audit-logs"  element={<Page><AuditLogViewer /></Page>} />
        </Route>

        {/* ── Tickets ── */}
        <Route path="tickets">
          <Route index element={<Page><TicketsList /></Page>} />
          <Route
            path="create"
            element={
              <ProtectedRoute requiredRoles={['CUSTOMER', 'EMPLOYEE', 'MANAGER']}>
                <Page><CreateTicket /></Page>
              </ProtectedRoute>
            }
          />
          <Route path=":ticketId" element={<Page><TicketDetail /></Page>} />
        </Route>
      </Route>

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

