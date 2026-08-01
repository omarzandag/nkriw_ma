import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaBuilding, FaUsers, FaCar, FaComments } from 'react-icons/fa'
import './HomePage.css'

export default function HomePage() {
  const { t } = useTranslation()

  const features = [
    {
      icon: <FaBuilding />,
      title: t('home.featureHousingTitle'),
      desc: t('home.featureHousingDesc'),
      link: '/housing',
      color: 'green',
    },
    {
      icon: <FaUsers />,
      title: t('home.featureColocationTitle'),
      desc: t('home.featureColocationDesc'),
      link: '/colocation',
      color: 'orange',
    },
    {
      icon: <FaCar />,
      title: t('home.featureCarpoolTitle'),
      desc: t('home.featureCarpoolDesc'),
      link: '/carpool',
      color: 'blue',
    },
    {
      icon: <FaComments />,
      title: t('home.featureForumTitle'),
      desc: t('home.featureForumDesc'),
      link: '/forum',
      color: 'purple',
    },
  ]

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">{t('home.heroTitle')}</h1>
            <p className="hero-subtitle">{t('home.heroSubtitle')}</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                {t('home.heroButton')}
              </Link>
              <Link to="/housing" className="btn btn-outline btn-lg">
                {t('common.viewAll')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section page-container">
        <div className="container">
          <h2 className="text-center text-2xl font-bold mb-5">{t('home.featuresTitle')}</h2>
          <div className="grid grid-4">
            {features.map((feature, index) => (
              <Link to={feature.link} key={index} className={`feature-card feature-${feature.color}`}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}