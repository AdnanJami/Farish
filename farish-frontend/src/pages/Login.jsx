import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FarishWordmark from '../components/FarishWordmark';
import '../styles/Login.css';

const BASE_URL = process.env.REACT_APP_API_URL || 'https://farish-hrx1.onrender.com/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(loginForm.email, loginForm.password);
      const isDashboardPath = (path) =>
        path === '/dashboard' || path.startsWith('/dashboard/');

      const returnTo = searchParams.get('returnTo');
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.startsWith('/login')) {
        if (user.role !== 'admin' && isDashboardPath(returnTo.split('?')[0])) {
          navigate('/', { replace: true });
        } else {
          navigate(returnTo, { replace: true });
        }
        return;
      }
      const from = location.state?.from;
      if (from?.pathname) {
        if (user.role !== 'admin' && isDashboardPath(from.pathname)) {
          navigate('/', { replace: true });
        } else {
          navigate(`${from.pathname}${from.search || ''}`, { replace: true });
        }
        return;
      }
      navigate(user.role === 'admin' ? '/dashboard' : '/', { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (regForm.password !== regForm.confirm) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regForm.full_name,
          email: regForm.email,
          phone: regForm.phone,
          password: regForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setSuccess('Account created! Please log in.');
      setTab('login');
      setLoginForm({ email: regForm.email, password: '' });
    } catch (err) {
      setError('Registration failed. Email may already be in use.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login">
      <div className="login__box">
        <div className="login__brand">
          <FarishWordmark size="lg" />
        </div>

        <div className="login__tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>Sign In</button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError(''); setSuccess(''); }}>Register</button>
        </div>

        {error && <div className="login__error">{error}</div>}
        {success && <div className="login__success">{success}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="login__form">
            <label>Email
              <input type="email" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} required />
            </label>
            <label>Password
              <input type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} required />
            </label>
            <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="login__form">
            <label>Full Name
              <input value={regForm.full_name} onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))} required />
            </label>
            <label>Email
              <input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} required />
            </label>
            <label>WhatsApp Number (with country code)
              <input value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} placeholder="+8801XXXXXXXXX" required />
            </label>
            <label>Password
              <input type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} required />
            </label>
            <label>Confirm Password
              <input type="password" value={regForm.confirm} onChange={e => setRegForm(f => ({ ...f, confirm: e.target.value }))} required />
            </label>
            <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create Account'}</button>
          </form>
        )}
      </div>
    </div>
  );
}