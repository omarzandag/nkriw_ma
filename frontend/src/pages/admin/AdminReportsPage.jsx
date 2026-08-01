import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { reportsAPI } from '../../services/api'
import { FaCheck, FaTimes, FaExclamationTriangle, FaBan } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Pagination from '../../components/Pagination'
import './Admin.css'

export default function AdminReportsPage() {
  const { t } = useTranslation()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const response = await reportsAPI.list({ page, per_page: 20 })
      setReports(response.data.items)
      setTotalPages(response.data.pages)
    } catch (error) { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { fetchReports() }, [page])

  const handleAction = async (reportId, status) => {
    try {
      await reportsAPI.takeAction(reportId, { status })
      toast.success(`Report ${status}`)
      fetchReports()
    } catch (error) { toast.error('Failed') }
  }

  return (
    <div className="page-container">
      <div className="container">
        <h1 className="text-2xl font-bold mb-4">{t('admin.manageReports')}</h1>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : reports.length === 0 ? (
          <div className="empty-state"><h3>{t('common.noResults')}</h3></div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report.id} className="card mb-3">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`badge badge-${report.status === 'pending' ? 'warning' : 'info'}`}>
                        {report.status}
                      </span>
                      <span className="badge badge-danger ml-2">{t(`report.${report.reason}`)}</span>
                    </div>
                    <span className="text-sm text-gray">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm"><strong>Type:</strong> {report.content_type}</p>
                  {report.description && <p className="text-sm mt-1">{report.description}</p>}
                  {report.status === 'pending' && (
                    <div className="flex gap-sm mt-3">
                      <button onClick={() => handleAction(report.id, 'reviewed')} className="btn btn-outline btn-sm"><FaCheck /> {t('admin.review')}</button>
                      <button onClick={() => handleAction(report.id, 'dismissed')} className="btn btn-outline btn-sm"><FaTimes /> {t('admin.dismiss')}</button>
                      <button onClick={() => handleAction(report.id, 'warned')} className="btn btn-outline btn-sm"><FaExclamationTriangle /> {t('admin.warn')}</button>
                      <button onClick={() => handleAction(report.id, 'suspended')} className="btn btn-outline btn-sm">{t('admin.suspend')}</button>
                      <button onClick={() => handleAction(report.id, 'banned')} className="btn btn-danger btn-sm"><FaBan /> {t('admin.ban')}</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  )
}