import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn, signUp, storeAuth } from '../api/apiClient';

const REMEMBER_EMAIL_KEY = 'interviewAssessmentRememberedEmail';

function MailIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 5.5l7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="6.8" r="3.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 17c0-3.3 3-5 6.5-5s6.5 1.7 6.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ crossed }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      {crossed && <line x1="2.5" y1="17.5" x2="17.5" y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
    </svg>
  );
}

function OrganizeIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="7.5" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 18c0-3 2.3-4.6 5-4.6s5 1.6 5 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.5 13.6c2.3.2 4 1.7 4 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CollaborateIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4.5" width="16" height="10.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 15v2.6L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 9.2h8M7 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AnalyzeIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18V10M11 18V4M18 18v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 18h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  { Icon: OrganizeIcon, title: 'Organize', desc: 'Keep candidates, interviewers, and slots in one directory.' },
  { Icon: CollaborateIcon, title: 'Collaborate', desc: 'Panels submit scorecards and feedback in real time.' },
  { Icon: AnalyzeIcon, title: 'Analyze', desc: 'Track pass rates and skill trends with built-in reports.' }
];

// Illustrative-only preview of the real dashboard/reports screens (module 7) -- not live data.
const STAGE_LEGEND = [
  { label: 'Scheduled', pct: 40, color: 'var(--navy)' },
  { label: 'In progress', pct: 20, color: 'var(--amber)' },
  { label: 'Submitted', pct: 20, color: 'var(--teal)' },
  { label: 'Recommended', pct: 15, color: 'var(--green)' },
  { label: 'Closed', pct: 5, color: 'var(--line-strong)' }
];

const DONUT_GRADIENT = (() => {
  let acc = 0;
  const stops = STAGE_LEGEND.map((s) => {
    const start = acc;
    acc += s.pct;
    return `${s.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
})();

export default function AuthPage({ mode, onAuthenticated }) {
  const isSignUp = mode === 'signup';
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  // Convenience only -- prefills the last email that opted into "remember me". Nothing about
  // the session/token itself changes; the backend token TTL (see SecurityConfig) is unaffected.
  useEffect(() => {
    if (isSignUp) return;
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) setForm((prev) => ({ ...prev, email: saved }));
  }, [isSignUp]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = isSignUp
        ? form
        : { email: form.email, password: form.password };
      const auth = isSignUp ? await signUp(payload) : await signIn(payload);

      if (!isSignUp) {
        if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, form.email);
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      storeAuth(auth);
      onAuthenticated?.(auth);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <aside className="auth-illustration" aria-hidden="true">
          <div className="auth-dot-grid" />

          <h2 className="auth-headline">
            Track Interviews.<br />
            Manage Talent.<br />
            <span className="accent">Hire Better.</span>
          </h2>
          <p className="auth-headline-sub">
            A smarter way to run interview panels and make confident, data-backed hiring decisions.
          </p>

          <ul className="auth-features">
            {FEATURES.map(({ Icon, title, desc }) => (
              <li className="auth-feature" key={title}>
                <span className="auth-feature-icon"><Icon /></span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="auth-product-card">
            <div className="auth-product-topbar">
              <span /><span /><span />
              <em>Dashboard</em>
            </div>

            <div className="auth-product-stats">
              <div className="auth-stat-tile">
                <span>Total interviews</span>
                <strong>128</strong>
              </div>
              <div className="auth-stat-tile">
                <span>Scheduled today</span>
                <strong>6</strong>
              </div>
            </div>

            <div className="auth-product-chart">
              <div className="auth-donut" style={{ background: DONUT_GRADIENT }} />
              <ul className="auth-donut-legend">
                {STAGE_LEGEND.map((s) => (
                  <li key={s.label}>
                    <span style={{ background: s.color }} />
                    {s.label}
                    <b>{s.pct}%</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-top-switch">
            {isSignUp ? 'Already have an account?' : 'New to the app?'}
            <Link to={isSignUp ? '/signin' : '/signup'}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </div>

          <div className="auth-form-head">
            <h1>{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
            <p>
              {isSignUp
                ? 'Set up access for recruiters and interview panel members.'
                : 'Please sign in to your account to continue.'}
            </p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={submit} className="auth-form">
            {isSignUp && (
              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <div className="field-icon-wrap">
                  <span className="field-icon"><UserIcon /></span>
                  <input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    autoComplete="name"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="field-icon-wrap">
                <span className="field-icon"><MailIcon /></span>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  autoComplete="email"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>
                {!isSignUp && <Link className="field-inline-link" to="/forgot-password">Forgot password?</Link>}
              </div>
              <div className="field-icon-wrap">
                <span className="field-icon"><LockIcon /></span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={isSignUp ? 8 : undefined}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="field-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </div>
            </div>

            {!isSignUp && (
              <label className="auth-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
            )}

            <button className="btn btn-primary btn-gradient auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
