import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminAPI } from '../../services/api'
import { FaUsers, FaHome, FaCar, FaComments, FaFlag, FaBan, FaChartBar, FaCog } from 'react-icons/fa'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import './Admin.css'

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [adsPerCity, setAdsPerCity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, regRes, cityRes] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getRegistrationStats(30),
          adminAPI.getAdsPerCity(),
        ])
        setStats(statsRes.data)
        setRegistrations(regRes.data)
        setAdsPerCity(cityRes.data.slice(0, 10))
      } catch (error) { console.error('Failed:', error) }
      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>

  const statCards = [
    { label: t('admin.totalUsers'), value: stats?.total_users, icon: <FaUsers />, color: 'blue' },
    { label: t('admin.activeUsers'), value: stats?.active_users, icon: <FaUsers />, color: 'green' },
    { label: t('admin.newUsers'), value: stats?.new_users, icon: <FaUsers />, color: 'orange' },
    { label: t('admin.totalHousingAds'), value: stats?.total_housing_ads, icon: <FaHome />, color: 'blue' },
    { label: t('admin.totalColocationAds'), value: stats?.total_colocation_ads, icon: <FaHome />, color: 'green' },
    { label: t('admin.totalCarpoolAds'), value: stats?.total_carpool_ads, icon: <FaCar />, color: 'orange' },
    { label: t('admin.totalForumThreads'), value: stats?.total_forum_threads, icon: <FaComments />, color: 'blue' },
    { label: t('admin.pendingReports'), value: stats?.pending_reports, icon: <FaFlag />, color: 'red' },
    { label: t('admin.bannedUsers'), value: stats?.banned_users, icon: <FaBan />, color: 'red' },
  ]

  return (
    <div className="page-container">
      <div className="container">
        <h1 className="text-2xl font-bold mb-4">{t('admin.title')}</h1>

        <div className="flex gap-md mb-4">
          <Link to="/admin/users" className="btn btn-outline"><FaUsers /> {t('admin.manageUsers')}</Link>
          <Link to="/admin/reports" className="btn btn-outline"><FaFlag /> {t('admin.manageReports')}</Link>
          <Link to="/admin/settings" className="btn btn-outline"><FaCog /> {t('admin.emailSettings')}</Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-3 mb-4">
          {statCards.map((stat, i) => (
            <div key={i} className="card">
              <div className="card-body flex items-center gap-md">
                <div className={`stat-icon stat-${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header"><FaChartBar /> {t('admin.registrationsOverTime')}</div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={registrations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#16A34A" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><FaChartBar /> {t('admin.adsPerCity')}</div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={adsPerCity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}