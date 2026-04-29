import { Routes, Route, Navigate } from 'react-router-dom'
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
  const { isAuthenticated, user } = useAuth()

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

        {/* Admin - Only accessible to managers */}
        {user?.role === 'MANAGER' && (
          <>
            <Route path="debug" element={<Debug />} />
            <Route path="admin">
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<UserAdminPanel />} />
              <Route path="categories" element={<CategoryAdminPanel />} />
              <Route path="tags" element={<TagAdminPanel />} />
              <Route path="slas" element={<SLAManagement />} />
              <Route path="audit-logs" element={<AuditLogViewer />} />
            </Route>
          </>
        )}

        {/* Tickets - Role-based access control */}
        <Route path="tickets">
          {/* View tickets - all authenticated users */}
          <Route index element={<TicketsList />} />

          {/* Create ticket - CUSTOMER, EMPLOYEE, and MANAGER */}
          <Route
            path="create"
            element={
              <ProtectedRoute requiredRoles={['CUSTOMER', 'EMPLOYEE', 'MANAGER']}>
                <CreateTicket />
              </ProtectedRoute>
            }
          />

          {/* View/Edit ticket - all can view, only assignee/manager can edit */}
          <Route path=":ticketId" element={<TicketDetail />} />
        </Route>
      </Route>

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
