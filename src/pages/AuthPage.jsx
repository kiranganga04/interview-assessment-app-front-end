import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn, signUp, storeAuth } from '../api/apiClient';

export default function AuthPage({ mode, onAuthenticated }) {
  const isSignUp = mode === 'signup';
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      storeAuth(auth);
      onAuthenticated?.(auth);
      navigate('/interviews', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <div className="eyebrow">Interview Assessment</div>
          <h1>{isSignUp ? 'Create your account' : 'Sign in'}</h1>
          <p>
            {isSignUp
              ? 'Set up access for recruiters and interview panel members.'
              : 'Continue managing candidate interview assessments.'}
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          {isSignUp && (
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              minLength={isSignUp ? 8 : undefined}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </div>

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : 'New to the app?'}{' '}
          <Link to={isSignUp ? '/signin' : '/signup'}>
            {isSignUp ? 'Sign in' : 'Create account'}
          </Link>
        </p>
      </section>
    </main>
  );
}
