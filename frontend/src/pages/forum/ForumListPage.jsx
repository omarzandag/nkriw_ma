import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { forumAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaPlus, FaComments, FaEye, FaThumbtack, FaSearch } from 'react-icons/fa'
import Pagination from '../../components/Pagination'
import '../housing/Housing.css'

export default function ForumListPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const categories = ['housing', 'colocation', 'transportation', 'universities', 'student_life', 'general', 'help']

  const fetchThreads = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 15 }
      if (category) params.category = category
      if (searchKeyword) params.keyword = searchKeyword
      const response = await forumAPI.listThreads(params)
      setThreads(response.data.items)
      setTotalPages(response.data.pages)
    } catch (error) { console.error('Failed:', error) }
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchKeyword(search.trim())
    setPage(1)
  }

  useEffect(() => { fetchThreads() }, [page, category, searchKeyword])

  return (
    <div className="page-container">
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t('forum.title')}</h1>
          {isAuthenticated && (
            <Link to="/forum/create" className="btn btn-primary"><FaPlus /> {t('forum.createThread')}</Link>
          )}
        </div>

        <form className="forum-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="form-input forum-search-input"
            placeholder={t('forum.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <FaSearch /> {t('common.search')}
          </button>
        </form>

        <div className="flex gap-sm mb-4 flex-wrap">
          <button className={`btn btn-sm ${category === '' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setCategory(''); setPage(1) }}>
            {t('common.all')}
          </button>
          {categories.map((cat) => (
            <button key={cat} className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setCategory(cat); setPage(1) }}>
              {t(`forum.categories.${cat}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : threads.length === 0 ? (
          <div className="empty-state"><h3>{t('common.noResults')}</h3></div>
        ) : (
          <div className="threads-list">
            {threads.map((thread) => (
              <Link to={`/forum/${thread.id}`} key={thread.id} className="card mb-3 thread-card">
                <div className="card-body flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-sm">
                      {thread.is_pinned && <FaThumbtack className="text-accent" />}
                      <h3 className="font-semibold">{thread.title}</h3>
                    </div>
                    <div className="flex gap-md mt-2 text-sm text-gray">
                      <span className="badge badge-info">{t(`forum.categories.${thread.category}`)}</span>
                      <span><FaComments /> {thread.replies_count} {t('forum.replies')}</span>
                      <span><FaEye /> {thread.views}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm text-sm text-gray hide-mobile">
                    {thread.author_profile_picture ? (
                      <Link to={`/users/${thread.author_username}`}>
                        <img src={thread.author_profile_picture} alt={thread.author_username} className="reply-avatar" />
                      </Link>
                    ) : (
                      <Link to={`/users/${thread.author_username}`}>
                        <div className="reply-avatar-placeholder">{thread.author_username?.charAt(0)?.toUpperCase()}</div>
                      </Link>
                    )}
                    <Link to={`/users/${thread.author_username}`} className="text-gray hover:text-primary">
                      {thread.author_username || 'User'}
                    </Link>
                    <span>·</span>
                    <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  )
}