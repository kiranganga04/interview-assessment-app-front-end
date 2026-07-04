import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/apiClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
    } finally {
      setLoading(false);
      // Always show the same confirmation, whether or not the email exists — module 1 (security):
      // this endpoint deliberately never reveals whether an account exists.
      setSent(true);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <div className="eyebrow">Interview Assessment</div>
          <h1>Reset your password</h1>
          <p>Enter the email on your account and we'll send a reset link if it matches one.</p>
        </div>

        {sent ? (
          <div className="card" style={{ marginTop: 24, padding: 18 }}>
            If an account exists for {email}, a password reset link has been sent.
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/signin">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
