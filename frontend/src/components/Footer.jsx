import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa'
import './Footer.css'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section">
            <h3 className="footer-brand">NKRIW<span className="brand-accent">.MA</span></h3>
            <p className="text-sm text-gray mt-2">
              {t('home.heroSubtitle')}
            </p>
            <div className="social-links">
              <a href="#" aria-label="Facebook"><FaFacebook /></a>
              <a href="#" aria-label="Twitter"><FaTwitter /></a>
              <a href="#" aria-label="Instagram"><FaInstagram /></a>
              <a href="#" aria-label="LinkedIn"><FaLinkedin /></a>
            </div>
          </div>

          <div className="footer-section">
            <h4>{t('common.appName')}</h4>
            <ul>
              <li><Link to="/">{t('nav.home')}</Link></li>
              <li><Link to="/housing">{t('nav.housing')}</Link></li>
              <li><Link to="/colocation">{t('nav.colocation')}</Link></li>
              <li><Link to="/carpool">{t('nav.carpool')}</Link></li>
              <li><Link to="/forum">{t('nav.forum')}</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>{t('common.profile')}</h4>
            <ul>
              <li><Link to="/login">{t('common.login')}</Link></li>
              <li><Link to="/register">{t('common.register')}</Link></li>
              <li><Link to="/profile">{t('common.profile')}</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>{t('nav.about')}</h4>
            <ul>
              <li><a href="#">{t('nav.about')}</a></li>
              <li><a href="#">{t('nav.contact')}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} NKRIW.MA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}