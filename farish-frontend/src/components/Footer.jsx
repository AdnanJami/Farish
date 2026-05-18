import { Link } from 'react-router-dom';
import FarishWordmark from './FarishWordmark';
import '../styles/Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link to="/" className="site-footer__logo">
            <FarishWordmark size="md" />
          </Link>
          <p className="site-footer__tagline">Curated designer wear, made to measure.</p>
        </div>
        <div className="site-footer__links">
          <Link to="/">Shop</Link>
          <Link to="/login">Account</Link>
        </div>
      </div>
      <div className="site-footer__bottom">
        <p>&copy; {year} Farish. All rights reserved.</p>
      </div>
    </footer>
  );
}
