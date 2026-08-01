import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="page-container">
      <div className="container">
        <div className="empty-state">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h3 className="mt-3">Page Not Found</h3>
          <p className="text-gray mt-2">The page you are looking for does not exist.</p>
          <Link to="/" className="btn btn-primary mt-4">{t('common.home')}</Link>
        </div>
      </div>
    </div>
  )
}