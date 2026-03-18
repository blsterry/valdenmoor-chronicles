import { useState, useEffect } from 'react';
import {
  adminListUsers, adminCreateUser,
  adminDeleteUser, adminResetPassword, adminResetSave,
} from './api.js';

const S = {
  wrap: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, #0a1208 0%, #030603 100%)',
    padding: '2rem',
    fontFamily: 'Georgia, serif',
  },
  header: { color: '#c9a96e', fontSize: '1.1rem', letterSpacing: '0.2em', marginBottom: '0.25rem' },
  sub: { color: '#4a3a2a', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '2rem' },
  card: {
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(201,169,110,0.15)',
    padding: '1.25rem',
    marginBottom: '1rem',
    maxWidth: 600,
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
  username: { color: '#c9a96e', fontSize: '0.95rem' },
  badge: { color: '#4caf7a', fontSize: '0.65rem', marginLeft: '0.5rem' },
  date: { color: '#3a2a1a', fontSize: '0.65rem' },
  actions: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  btn: (color = '#6a5a4a') => ({
    background: 'transparent',
    border: `1px solid ${color}40`,
    color,
    fontFamily: 'Georgia, serif',
    fontSize: '0.7rem',
    padding: '0.25rem 0.6rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  input: {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(201,169,110,0.3)',
    color: '#d4c4a0',
    fontFamily: 'Georgia, serif',
    fontSize: '0.85rem',
    padding: '0.25rem 0.2rem',
    outline: 'none',
    width: 160,
  },
  error: { color: '#c94a4a', fontSize: '0.75rem', marginTop: '0.5rem' },
  success: { color: '#4caf7a', fontSize: '0.75rem', marginTop: '0.5rem' },
};

export default function Admin({ onBack }) {
  const [users, setUsers]       = useState([]);
  const [newUser, setNewUser]   = useState({ username: '', password: '' });
  const [pwReset, setPwReset]   = useState({});  // { [id]: newPw }
  const [showPw, setShowPw]     = useState({});  // { [id]: bool, new: bool }
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  async function load() {
    setUsers(await adminListUsers());
  }

  useEffect(() => { load(); }, []);

  function flash(ok, text) {
    if (ok) { setMsg(text); setErr(''); }
    else     { setErr(text); setMsg(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 3000);
  }

  async function createUser() {
    try {
      await adminCreateUser(newUser.username, newUser.password);
      setNewUser({ username: '', password: '' });
      flash(true, `User "${newUser.username}" created.`);
      load();
    } catch (e) { flash(false, e.message); }
  }

  async function deleteUser(u) {
    if (!confirm(`Delete user "${u.username}"? Their save will be lost.`)) return;
    await adminDeleteUser(u.id);
    flash(true, `Deleted ${u.username}.`);
    load();
  }

  async function resetPw(u) {
    const pw = pwReset[u.id];
    if (!pw) return flash(false, 'Enter a password.');
    await adminResetPassword(u.id, pw);
    setPwReset(p => ({ ...p, [u.id]: '' }));
    flash(true, `Password updated for ${u.username}.`);
  }

  async function resetSave(u) {
    if (!confirm(`Wipe save for "${u.username}"? This cannot be undone.`)) return;
    await adminResetSave(u.id);
    flash(true, `Save cleared for ${u.username}.`);
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>ADMIN PANEL</div>
      <div style={S.sub}>VALDENMOOR CHRONICLES — USER MANAGEMENT</div>

      <button
        onClick={onBack}
        style={{ ...S.btn('#c9a96e'), marginBottom: '1.5rem' }}
      >← Back to Game</button>

      {/* Add user */}
      <div style={S.card}>
        <div style={{ color: '#6a5a4a', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>ADD NEW PLAYER</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#4a3a2a', fontSize: '0.6rem', marginBottom: '0.2rem' }}>USERNAME</div>
            <input style={S.input} value={newUser.username}
              onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
              placeholder="username" />
          </div>
          <div>
            <div style={{ color: '#4a3a2a', fontSize: '0.6rem', marginBottom: '0.2rem' }}>TEMPORARY PASSWORD</div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input style={S.input} value={newUser.password}
                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                placeholder="password" type={showPw['new'] ? 'text' : 'password'} />
              <button type="button" onClick={() => setShowPw(p => ({ ...p, new: !p['new'] }))}
                style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#6a5a4a', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'Georgia, serif' }}
              >{showPw['new'] ? 'hide' : 'show'}</button>
            </div>
            <div style={{ color: newUser.password.length > 0 && newUser.password.length < 6 ? '#c94a4a' : '#3a2a1a', fontSize: '0.58rem', marginTop: '0.25rem' }}>
              min. 6 characters · no spaces
            </div>
          </div>
          <button
            style={{ ...S.btn('#4caf7a'), marginTop: '1.1rem' }}
            disabled={!newUser.username || newUser.password.length < 6}
            onClick={createUser}
          >Create Player</button>
        </div>
        {msg && <div style={S.success}>{msg}</div>}
        {err && <div style={S.error}>{err}</div>}
      </div>

      {/* User list */}
      <div style={{ color: '#4a3a2a', fontSize: '0.62rem', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
        {users.length} PLAYER{users.length !== 1 ? 'S' : ''}
      </div>

      {users.map(u => (
        <div key={u.id} style={S.card}>
          <div style={S.row}>
            <div>
              <span style={S.username}>{u.username}</span>
              {u.is_admin && <span style={S.badge}>ADMIN</span>}
              <div style={S.date}>Joined {new Date(u.created_at).toLocaleDateString()}</div>
            </div>
            {!u.is_admin && (
              <div style={S.actions}>
                <button style={S.btn('#c94a4a')} onClick={() => deleteUser(u)}>Delete</button>
                <button style={S.btn('#b09a70')} onClick={() => resetSave(u)}>Wipe Save</button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <input
                  style={{ ...S.input, width: 180 }}
                  placeholder="New password"
                  type={showPw[u.id] ? 'text' : 'password'}
                  value={pwReset[u.id] || ''}
                  onChange={e => setPwReset(p => ({ ...p, [u.id]: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, [u.id]: !p[u.id] }))}
                  style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#6a5a4a', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'Georgia, serif' }}
                >{showPw[u.id] ? 'hide' : 'show'}</button>
              </div>
              <div style={{ color: '#3a2a1a', fontSize: '0.58rem', marginTop: '0.2rem' }}>
                admin can set any password
              </div>
            </div>
            <button style={{ ...S.btn('#b09a70'), marginBottom: '1rem' }} onClick={() => resetPw(u)}>Reset Password</button>
          </div>
        </div>
      ))}
    </div>
  );
}
