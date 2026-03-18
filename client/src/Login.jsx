import { useState } from 'react';
import { login } from './api.js';

const S = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at top, #12082a 0%, #05030d 100%)',
  },
  box: {
    width: '100%',
    maxWidth: 360,
    padding: '2.5rem 2rem',
    border: '1px solid rgba(201,169,110,0.25)',
    background: 'rgba(0,0,0,0.6)',
  },
  title: {
    textAlign: 'center',
    color: '#c9a96e',
    fontSize: '1.5rem',
    letterSpacing: '0.2em',
    marginBottom: '0.25rem',
  },
  subtitle: {
    textAlign: 'center',
    color: '#4a3a2a',
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    marginBottom: '2rem',
  },
  label: { display: 'block', color: '#6a5a4a', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.3rem' },
  input: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(201,169,110,0.35)',
    color: '#d4c4a0',
    fontFamily: 'Georgia, serif',
    fontSize: '0.95rem',
    padding: '0.35rem 0.2rem',
    outline: 'none',
    marginBottom: '1.25rem',
  },
  btn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid rgba(201,169,110,0.5)',
    color: '#c9a96e',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
    padding: '0.6rem',
    cursor: 'pointer',
    letterSpacing: '0.1em',
    marginTop: '0.5rem',
    transition: 'all 0.15s',
  },
  error: { color: '#c94a4a', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.75rem' },
  divider: { borderColor: 'rgba(201,169,110,0.1)', margin: '1.5rem 0' },
};

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPw, setShowPw]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={S.title}>VALDENMOOR</div>
        <div style={S.subtitle}>CHRONICLES</div>

        <form onSubmit={handleSubmit}>
          <label style={S.label}>USERNAME</label>
          <input
            style={S.input}
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />

          <label style={S.label}>PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...S.input, paddingRight: '2.2rem' }}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-70%)', background: 'transparent', border: 'none', color: '#6a5a4a', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'Georgia, serif', padding: '0.2rem 0.3rem' }}
            >{showPw ? 'hide' : 'show'}</button>
          </div>

          <button
            style={S.btn}
            type="submit"
            disabled={loading || !username || !password}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(201,169,110,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            {loading ? '✦ entering...' : 'Enter the World'}
          </button>
        </form>

        {error && <div style={S.error}>{error}</div>}

        <hr style={S.divider} />
        <div style={{ textAlign: 'center', color: '#3a2a1a', fontSize: '0.62rem', fontStyle: 'italic' }}>
          Forgot your password? Ask the admin to reset it.
        </div>
      </div>
    </div>
  );
}
