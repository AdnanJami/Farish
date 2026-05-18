import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FarishWordmark from './FarishWordmark';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">
        <FarishWordmark size="md" className="navbar__wordmark" />
      </Link>
      <div className="navbar__right">
        {user ? (
          <>
            <span className="navbar__greeting">Hi, {user.full_name?.split(' ')[0]}</span>
            {isAdmin && <Link to="/dashboard" className="navbar__link">Dashboard</Link>}
            <button className="navbar__btn" onClick={() => { logout(); navigate('/'); }}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="navbar__btn">Login / Register</Link>
        )}
      </div>
    </nav>
  );
}