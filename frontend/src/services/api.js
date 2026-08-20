import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach JWT token & Lang
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nkriwma_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const lang = localStorage.getItem('i18nextLng') || 'fr'
    config.headers['Accept-Language'] = lang
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nkriwma_token')
      localStorage.removeItem('nkriwma_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadProfilePicture: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/users/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadCoverPicture: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/users/profile/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getPublicProfile: (username) => api.get(`/users/${username}`),
}

// Housing API
export const housingAPI = {
  list: (params) => api.get('/housing', { params }),
  get: (id) => api.get(`/housing/${id}`),
  create: (data) => api.post('/housing', data),
  update: (id, data) => api.put(`/housing/${id}`, data),
  delete: (id) => api.delete(`/housing/${id}`),
  markRented: (id) => api.post(`/housing/${id}/mark-rented`),
  renew: (id) => api.post(`/housing/${id}/renew`),
  uploadImages: (id, files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return api.post(`/housing/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getMyAds: (params) => api.get('/housing/my/ads', { params }),
}

// Colocation API
export const colocationAPI = {
  list: (params) => api.get('/colocation', { params }),
  get: (id) => api.get(`/colocation/${id}`),
  create: (data) => api.post('/colocation', data),
  update: (id, data) => api.put(`/colocation/${id}`, data),
  delete: (id) => api.delete(`/colocation/${id}`),
  markFound: (id) => api.post(`/colocation/${id}/mark-found`),
  uploadImages: (id, files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return api.post(`/colocation/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getMyAds: (params) => api.get('/colocation/my/ads', { params }),
}

// Carpool API
export const carpoolAPI = {
  list: (params) => api.get('/carpool', { params }),
  get: (id) => api.get(`/carpool/${id}`),
  create: (data) => api.post('/carpool', data),
  update: (id, data) => api.put(`/carpool/${id}`, data),
  delete: (id) => api.delete(`/carpool/${id}`),
  markCompleted: (id) => api.post(`/carpool/${id}/mark-completed`),
  getMyAds: (params) => api.get('/carpool/my/ads', { params }),
  createBooking: (id, data) => api.post(`/carpool/${id}/bookings`, data),
  getBookings: (id) => api.get(`/carpool/${id}/bookings`),
  getMyReservations: () => api.get('/carpool/bookings/my/reservations'),
  getMyIncomingRequests: () => api.get('/carpool/bookings/my/requests'),
  acceptBooking: (bookingId) => api.post(`/carpool/bookings/${bookingId}/accept`),
  rejectBooking: (bookingId) => api.post(`/carpool/bookings/${bookingId}/reject`),
  cancelBooking: (bookingId) => api.post(`/carpool/bookings/${bookingId}/cancel`),
}

// Forum API
export const forumAPI = {
  listThreads: (params) => api.get('/forum/threads', { params }),
  getThread: (id) => api.get(`/forum/threads/${id}`),
  createThread: (data) => api.post('/forum/threads', data),
  updateThread: (id, data) => api.put(`/forum/threads/${id}`, data),
  deleteThread: (id) => api.delete(`/forum/threads/${id}`),
  listReplies: (threadId, params) => api.get(`/forum/threads/${threadId}/replies`, { params }),
  createReply: (threadId, data) => api.post(`/forum/threads/${threadId}/replies`, data),
  updateReply: (replyId, data) => api.put(`/forum/replies/${replyId}`, data),
  deleteReply: (replyId) => api.delete(`/forum/replies/${replyId}`),
  toggleReplyLike: (replyId) => api.post(`/forum/replies/${replyId}/like`),
  togglePin: (threadId) => api.post(`/forum/threads/${threadId}/pin`),
  toggleClose: (threadId) => api.post(`/forum/threads/${threadId}/close`),
  followThread: (threadId) => api.post(`/forum/threads/${threadId}/follow`),
  unfollowThread: (threadId) => api.post(`/forum/threads/${threadId}/unfollow`),
}

// Messaging API
export const messagingAPI = {
  listConversations: () => api.get('/messaging/conversations'),
  getMessages: (conversationId, params) => api.get(`/messaging/conversations/${conversationId}/messages`, { params }),
  startConversation: (receiverId, data) => api.post('/messaging/conversations', data, { params: { receiver_id: receiverId } }),
  sendMessage: (conversationId, data) => api.post(`/messaging/conversations/${conversationId}/messages`, data),
  deleteConversation: (id) => api.delete(`/messaging/conversations/${id}`),
  blockUser: (id) => api.post(`/messaging/conversations/${id}/block`),
  unblockUser: (id) => api.post(`/messaging/conversations/${id}/unblock`),
  getUnreadCount: () => api.get('/messaging/unread-count'),
  markConversationRead: (conversationId) => api.post(`/messaging/conversations/${conversationId}/read`),
}

// Comments API
export const commentsAPI = {
  list: (contentType, contentId) => api.get(`/comments/${contentType}/${contentId}`),
  create: (contentType, contentId, data) => api.post(`/comments/${contentType}/${contentId}`, data),
  update: (commentId, data) => api.put(`/comments/${commentId}`, data),
  delete: (commentId) => api.delete(`/comments/${commentId}`),
  toggleLike: (commentId) => api.post(`/comments/${commentId}/like`),
}

// Notifications API
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
}

// Reports API
export const reportsAPI = {
  create: (data) => api.post('/reports', data),
  list: (params) => api.get('/reports', { params }),
  get: (id) => api.get(`/reports/${id}`),
  takeAction: (id, data) => api.post(`/reports/${id}/action`, data),
  getMyReports: (params) => api.get('/reports/my/reports', { params }),
}

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getRegistrationStats: (days) => api.get('/admin/stats/registrations', { params: { days } }),
  getAdsPerCity: () => api.get('/admin/stats/ads-per-city'),
  getForumActivity: (days) => api.get('/admin/stats/forum-activity', { params: { days } }),
  listUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  suspendUser: (id) => api.post(`/admin/users/${id}/suspend`),
  unsuspendUser: (id) => api.post(`/admin/users/${id}/unsuspend`),
  banUser: (id) => api.post(`/admin/users/${id}/ban`),
  unbanUser: (id) => api.post(`/admin/users/${id}/unban`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  listHousing: (params) => api.get('/admin/housing', { params }),
  deleteHousing: (id) => api.delete(`/admin/housing/${id}`),
  deleteColocation: (id) => api.delete(`/admin/colocation/${id}`),
  deleteCarpool: (id) => api.delete(`/admin/carpool/${id}`),
  deleteThread: (id) => api.delete(`/admin/forum/threads/${id}`),
  deleteReply: (id) => api.delete(`/admin/forum/replies/${id}`),
  deleteComment: (id) => api.delete(`/admin/comments/${id}`),
}

export default api