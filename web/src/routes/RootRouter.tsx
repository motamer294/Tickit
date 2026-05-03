import { Routes, Route, Navigate, Outlet } from 'react-router-dom' // Added Outlet
import DashboardLayout from '@/layouts/DashboardLayout'
import ProtectedRoute from './ProtectedRoute'

/* Pages */
import Dashboard from '@/pages/dashboard/Dashboard'

/* Tickets */
import TicketsList from '@/pages/tickets/TicketsList'
import CreateTicket from '@/pages/tickets/CreateTicket'
import TicketDetail from '@/pages/tickets/TicketDetail'

/* Profile */
import { UserProfile } from '@/pages/profile/UserProfile'

/* Admin */
import UserAdminPanel from '@/pages/admin/UserAdminPanel'
import SLAManagement from '@/pages/admin/SLAManagement'
import AuditLogViewer from '@/pages/admin/AuditLogViewer'
import CategoryAdminPanel from '@/pages/admin/CategoryAdminPanel'
import TagAdminPanel from '@/pages/admin/TagAdminPanel'

/* layouts */
import AuthLayout from '@/layouts/AuthLayout'

/* auth pages */
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'

/* debug */
import Debug from '@/pages/Debug'

import { useAuth } from '@/hooks/useAuth'

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
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
        {/* Redirect */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Core - Accessible by all authenticated users */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Profile - Accessible by all authenticated users */}
        <Route path="profile" element={<UserProfile />} />

        {/* ================= ADMIN ROUTES ================= */}
        {/* Wrapped in ProtectedRoute with 'MANAGER' requirement */}
        <Route
          path="debug"
          element={
            <ProtectedRoute requiredRoles={['MANAGER']}>
              <Debug />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin"
          element={
            <ProtectedRoute requiredRoles={['MANAGER']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UserAdminPanel />} />
          <Route path="categories" element={<CategoryAdminPanel />} />
          <Route path="tags" element={<TagAdminPanel />} />
          <Route path="slas" element={<SLAManagement />} />
          <Route path="audit-logs" element={<AuditLogViewer />} />
        </Route>

        {/* ================= TICKETS ================= */}
        <Route path="tickets">
          <Route index element={<TicketsList />} />

          <Route
            path="create"
            element={
              <ProtectedRoute requiredRoles={['CUSTOMER', 'EMPLOYEE', 'MANAGER']}>
                <CreateTicket />
              </ProtectedRoute>
            }
          />

          <Route path=":ticketId" element={<TicketDetail />} />
        </Route>
      </Route>

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
