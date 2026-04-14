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

        {/* Debug - Accessible by all authenticated users */}
        <Route path="debug" element={<Debug />} />

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
