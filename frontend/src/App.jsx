import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import HousingListPage from './pages/housing/HousingListPage'
import HousingDetailPage from './pages/housing/HousingDetailPage'
import HousingCreatePage from './pages/housing/HousingCreatePage'
import ColocationListPage from './pages/colocation/ColocationListPage'
import ColocationDetailPage from './pages/colocation/ColocationDetailPage'
import ColocationCreatePage from './pages/colocation/ColocationCreatePage'
import CarpoolListPage from './pages/carpool/CarpoolListPage'
import CarpoolDetailPage from './pages/carpool/CarpoolDetailPage'
import CarpoolCreatePage from './pages/carpool/CarpoolCreatePage'
import ForumListPage from './pages/forum/ForumListPage'
import ForumThreadPage from './pages/forum/ForumThreadPage'
import ForumCreatePage from './pages/forum/ForumCreatePage'
import MessagesPage from './pages/messaging/MessagesPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import ProfilePage from './pages/profile/ProfilePage'
import EditProfilePage from './pages/profile/EditProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Housing routes */}
          <Route path="/housing" element={<HousingListPage />} />
          <Route path="/housing/:id" element={<HousingDetailPage />} />
          <Route path="/housing/create" element={<ProtectedRoute><HousingCreatePage /></ProtectedRoute>} />
          <Route path="/housing/:id/edit" element={<ProtectedRoute><HousingCreatePage /></ProtectedRoute>} />

          {/* Colocation routes */}
          <Route path="/colocation" element={<ColocationListPage />} />
          <Route path="/colocation/:id" element={<ColocationDetailPage />} />
          <Route path="/colocation/create" element={<ProtectedRoute><ColocationCreatePage /></ProtectedRoute>} />
          <Route path="/colocation/:id/edit" element={<ProtectedRoute><ColocationCreatePage /></ProtectedRoute>} />

          {/* Carpool routes */}
          <Route path="/carpool" element={<CarpoolListPage />} />
          <Route path="/carpool/:id" element={<CarpoolDetailPage />} />
          <Route path="/carpool/create" element={<ProtectedRoute><CarpoolCreatePage /></ProtectedRoute>} />
          <Route path="/carpool/:id/edit" element={<ProtectedRoute><CarpoolCreatePage /></ProtectedRoute>} />

          {/* Forum routes */}
          <Route path="/forum" element={<ForumListPage />} />
          <Route path="/forum/:id" element={<ForumThreadPage />} />
          <Route path="/forum/create" element={<ProtectedRoute><ForumCreatePage /></ProtectedRoute>} />

          {/* Messaging routes */}
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/messages/:conversationId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

          {/* Notifications route */}
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

          {/* Profile routes */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
          <Route path="/users/:username" element={<ProfilePage />} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReportsPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettingsPage /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App