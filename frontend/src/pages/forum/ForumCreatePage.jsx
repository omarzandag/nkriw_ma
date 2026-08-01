import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { forumAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ForumCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ title: '', category: 'general', content: '' })

  const categories = ['housing', 'colocation', 'transportation', 'universities', 'student_life', 'general', 'help']

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forumAPI.createThread(formData)
      toast.success('Thread created')
      navigate('/forum')
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed') }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <h1 className="text-2xl font-bold mb-4">{t('forum.createThread')}</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('forum.threadTitle')}</label>
              <input type="text" name="title" className="form-input" value={formData.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('forum.category')}</label>
              <select name="category" className="form-select" value={formData.category} onChange={handleChange}>
                {categories.map((cat) => <option key={cat} value={cat}>{t(`forum.categories.${cat}`)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('forum.content')}</label>
              <textarea name="content" className="form-textarea" value={formData.content} onChange={handleChange} required style={{ minHeight: '200px' }} />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="spinner"></span> : t('common.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}