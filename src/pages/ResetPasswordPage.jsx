import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/apiClient';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmPasswordReset(token, newPassword);
      navigate('/signin', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <div className="eyebrow">Interview Assessment</div>
          <h1>Choose a new password</h1>
          <p>Paste the reset token from your email and pick a new password.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label htmlFor="token">Reset token</label>
            <input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Reset password'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/signin">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
