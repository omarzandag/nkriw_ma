import { useTranslation } from 'react-i18next'

export default function Pagination({ page, totalPages, onPageChange }) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null

  const pages = []
  const maxButtons = 5
  let start = Math.max(1, page - Math.floor(maxButtons / 2))
  let end = Math.min(totalPages, start + maxButtons - 1)
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return (
    <div className="pagination">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        &larr; {t('common.previous')}
      </button>
      {pages.map((p) => (
        <button key={p} className={p === page ? 'active' : ''} onClick={() => onPageChange(p)}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        {t('common.next')} &rarr;
      </button>
    </div>
  )
}