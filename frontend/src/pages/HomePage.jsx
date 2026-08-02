import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FaBuilding,
  FaUsers,
  FaCar,
  FaComments,
  FaSearch,
  FaHandshake,
  FaHome,
  FaShieldAlt,
  FaBolt,
  FaGlobe,
  FaHeart,
  FaCheckCircle,
  FaArrowRight,
} from 'react-icons/fa'
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

  const stats = [
    { icon: <FaUsers />, value: '1,000+', label: t('home.statsUsers') },
    { icon: <FaBuilding />, value: '500+', label: t('home.statsAds') },
    { icon: <FaGlobe />, value: '15+', label: t('home.statsCities') },
    { icon: <FaHandshake />, value: '300+', label: t('home.statsMatches') },
  ]

  const steps = [
    {
      icon: <FaSearch />,
      title: t('home.step1Title'),
      desc: t('home.step1Desc'),
    },
    {
      icon: <FaHandshake />,
      title: t('home.step2Title'),
      desc: t('home.step2Desc'),
    },
    {
      icon: <FaHome />,
      title: t('home.step3Title'),
      desc: t('home.step3Desc'),
    },
  ]

  const cities = [
    { name: 'Casablanca', emoji: '🏙️' },
    { name: 'Rabat', emoji: '🏛️' },
    { name: 'Marrakech', emoji: '🕌' },
    { name: 'Fès', emoji: '🎓' },
    { name: 'Tanger', emoji: '🌊' },
    { name: 'Agadir', emoji: '🏖️' },
  ]

  const benefits = [
    {
      icon: <FaShieldAlt />,
      title: t('home.benefit1Title'),
      desc: t('home.benefit1Desc'),
    },
    {
      icon: <FaBolt />,
      title: t('home.benefit2Title'),
      desc: t('home.benefit2Desc'),
    },
    {
      icon: <FaHeart />,
      title: t('home.benefit3Title'),
      desc: t('home.benefit3Desc'),
    },
    {
      icon: <FaGlobe />,
      title: t('home.benefit4Title'),
      desc: t('home.benefit4Desc'),
    },
  ]

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title anim-fade-in-up">{t('home.heroTitle')}</h1>
            <p className="hero-subtitle anim-fade-in-up delay-1">{t('home.heroSubtitle')}</p>
            <div className="hero-actions anim-fade-in-up delay-2">
              <Link to="/register" className="btn btn-primary btn-lg">
                {t('home.heroButton')}
                <FaArrowRight />
              </Link>
              <Link to="/housing" className="btn btn-outline btn-lg">
                {t('common.viewAll')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`stat-item anim-fade-in-up delay-${index + 1}`}
              >
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title text-center anim-fade-in-down">
            {t('home.featuresTitle')}
          </h2>
          <p className="section-subtitle text-center anim-fade-in-down delay-1">
            {t('home.featuresSubtitle')}
          </p>
          <div className="grid grid-4">
            {features.map((feature, index) => (
              <Link
                to={feature.link}
                key={index}
                className={`feature-card feature-${feature.color} anim-fade-in-up delay-${index + 1}`}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
                <span className="feature-link">
                  {t('common.viewDetails')} <FaArrowRight />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title text-center anim-fade-in-down">
            {t('home.howItWorksTitle')}
          </h2>
          <p className="section-subtitle text-center anim-fade-in-down delay-1">
            {t('home.howItWorksSubtitle')}
          </p>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`step-card anim-fade-in-up delay-${index + 1}`}
              >
                <div className="step-number">{index + 1}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {index < steps.length - 1 && (
                  <div className="step-connector">
                    <FaArrowRight />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Cities Section */}
      <section className="cities-section">
        <div className="container">
          <h2 className="section-title text-center anim-fade-in-down">
            {t('home.citiesTitle')}
          </h2>
          <p className="section-subtitle text-center anim-fade-in-down delay-1">
            {t('home.citiesSubtitle')}
          </p>
          <div className="cities-grid">
            {cities.map((city, index) => (
              <Link
                to={`/housing?city=${city.name}`}
                key={index}
                className={`city-card anim-scale-in delay-${index + 1}`}
              >
                <span className="city-emoji">{city.emoji}</span>
                <span className="city-name">{city.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="benefits-section">
        <div className="container">
          <h2 className="section-title text-center anim-fade-in-down">
            {t('home.benefitsTitle')}
          </h2>
          <p className="section-subtitle text-center anim-fade-in-down delay-1">
            {t('home.benefitsSubtitle')}
          </p>
          <div className="grid grid-2">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`benefit-card anim-fade-in-${index % 2 === 0 ? 'left' : 'right'} delay-${index + 1}`}
              >
                <div className="benefit-icon">{benefit.icon}</div>
                <div className="benefit-content">
                  <h3 className="benefit-title">{benefit.title}</h3>
                  <p className="benefit-desc">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content anim-scale-in">
            <h2 className="cta-title">{t('home.ctaTitle')}</h2>
            <p className="cta-subtitle">{t('home.ctaSubtitle')}</p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                {t('home.heroButton')}
                <FaArrowRight />
              </Link>
              <Link to="/forum" className="btn btn-outline btn-lg">
                {t('home.ctaButton2')}
              </Link>
            </div>
            <div className="cta-features">
              <span><FaCheckCircle /> {t('home.ctaFeature1')}</span>
              <span><FaCheckCircle /> {t('home.ctaFeature2')}</span>
              <span><FaCheckCircle /> {t('home.ctaFeature3')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}