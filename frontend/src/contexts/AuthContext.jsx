import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('nkriwma_token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const response = await authAPI.getMe()
      setUser(response.data)
      setIsAuthenticated(true)
    } catch (error) {
      localStorage.removeItem('nkriwma_token')
      localStorage.removeItem('nkriwma_user')
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      const { access_token, user_id, username, is_admin } = response.data
      localStorage.setItem('nkriwma_token', access_token)
      localStorage.setItem('nkriwma_user', JSON.stringify({ user_id, username, is_admin }))
      await loadUser()
      toast.success('Login successful!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (data) => {
    try {
      const response = await authAPI.register(data)
      const { access_token, user_id, username, is_admin } = response.data
      localStorage.setItem('nkriwma_token', access_token)
      localStorage.setItem('nkriwma_user', JSON.stringify({ user_id, username, is_admin }))
      await loadUser()
      toast.success('Registration successful!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('nkriwma_token')
    localStorage.removeItem('nkriwma_user')
    setUser(null)
    setIsAuthenticated(false)
    toast.success('Logged out successfully')
  }

  const updateUser = (newUser) => {
    setUser(newUser)
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    loadUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}