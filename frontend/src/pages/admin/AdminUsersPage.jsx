import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { adminAPI } from '../../services/api'
import { FaBan, FaCheck, FaTrash, FaSearch } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Pagination from '../../components/Pagination'
import './Admin.css'

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 20 }
      if (search) params.search = search
      const response = await adminAPI.listUsers(params)
      setUsers(response.data.items)
      setTotalPages(response.data.pages)
    } catch (error) { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [page])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchUsers() }

  const handleBan = async (userId) => {
    if (!window.confirm('Ban this user?')) return
    try { await adminAPI.banUser(userId); toast.success('User banned'); fetchUsers() }
    catch (error) { toast.error('Failed') }
  }

  const handleUnban = async (userId) => {
    try { await adminAPI.unbanUser(userId); toast.success('User unbanned'); fetchUsers() }
    catch (error) { toast.error('Failed') }
  }

  const handleSuspend = async (userId) => {
    try { await adminAPI.suspendUser(userId); toast.success('User suspended'); fetchUsers() }
    catch (error) { toast.error('Failed') }
  }

  const handleUnsuspend = async (userId) => {
    try { await adminAPI.unsuspendUser(userId); toast.success('User unsuspended'); fetchUsers() }
    catch (error) { toast.error('Failed') }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user permanently?')) return
    try { await adminAPI.deleteUser(userId); toast.success('User deleted'); fetchUsers() }
    catch (error) { toast.error('Failed') }
  }

  return (
    <div className="page-container">
      <div className="container">
        <h1 className="text-2xl font-bold mb-4">{t('admin.manageUsers')}</h1>

        <form onSubmit={handleSearch} className="flex gap-sm mb-4">
          <input type="text" className="form-input" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary"><FaSearch /></button>
        </form>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : (
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('profile.fullName')}</th>
                    <th>{t('auth.email')}</th>
                    <th>{t('common.city')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name} <span className="text-sm text-gray">@{u.username}</span></td>
                      <td>{u.email}</td>
                      <td>{u.city || '-'}</td>
                      <td>
                        {u.is_banned && <span className="badge badge-danger">Banned</span>}
                        {u.is_suspended && <span className="badge badge-warning">Suspended</span>}
                        {!u.is_banned && !u.is_suspended && <span className="badge badge-success">Active</span>}
                        {u.is_admin && <span className="badge badge-info">Admin</span>}
                      </td>
                      <td>
                        <div className="flex gap-sm">
                          {u.is_banned ? (
                            <button onClick={() => handleUnban(u.id)} className="btn btn-outline btn-sm"><FaCheck /> {t('admin.unban')}</button>
                          ) : (
                            <button onClick={() => handleBan(u.id)} className="btn btn-outline btn-sm"><FaBan /> {t('admin.ban')}</button>
                          )}
                          {u.is_suspended ? (
                            <button onClick={() => handleUnsuspend(u.id)} className="btn btn-outline btn-sm">{t('admin.unsuspend')}</button>
                          ) : (
                            <button onClick={() => handleSuspend(u.id)} className="btn btn-outline btn-sm">{t('admin.suspend')}</button>
                          )}
                          <button onClick={() => handleDelete(u.id)} className="btn btn-danger btn-sm"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  )
}