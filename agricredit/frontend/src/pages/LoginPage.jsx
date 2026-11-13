import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import AlertBanner from '../components/AlertBanner';

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('AgriAdmin@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.login(username, password);
      const { token, user } = res.data;

      localStorage.setItem('agricredit_token', token);
      localStorage.setItem('agricredit_user', JSON.stringify(user));

      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'var(--forest-100)',
            color: 'var(--forest-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.65rem', color: 'var(--forest-900)' }}>Officer Authentication</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Agricultural Credit Sanction Portal
          </p>
        </div>

        {error && <AlertBanner type="error" title="Access Denied" message={error} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Officer Username
            </label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Password
            </label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In as Credit Officer'}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          padding: '0.85rem',
          background: 'var(--forest-50)',
          borderRadius: '8px',
          border: '1px solid var(--forest-200)',
          fontSize: '0.8rem',
          color: 'var(--forest-800)',
        }}>
          <strong>Default Evaluation Credentials:</strong><br />
          Username: <code>admin</code><br />
          Password: <code>AgriAdmin@2026</code>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
