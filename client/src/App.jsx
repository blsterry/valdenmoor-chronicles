import { useState, useEffect } from 'react';
import { getCurrentUser, logout } from './api.js';
import Login from './Login.jsx';
import Game from './Game.jsx';
import Admin from './Admin.jsx';

export default function App() {
  const [user, setUser]         = useState(null);
  const [screen, setScreen]     = useState('loading');

  useEffect(() => {
    const u = getCurrentUser();
    if (u) { setUser(u); setScreen('game'); }
    else    { setScreen('login'); }
  }, []);

  function handleLogin(u) {
    setUser(u);
    setScreen('game');
  }

  function handleLogout() {
    logout();
    setUser(null);
    setScreen('login');
  }

  if (screen === 'loading') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
                    background:'#05030d', color:'#4a3a2a', fontFamily:'Georgia, serif', letterSpacing:'0.15em' }}>
        ✦
      </div>
    );
  }

  if (screen === 'login') return <Login onLogin={handleLogin} />;

  if (screen === 'admin') return <Admin onBack={() => setScreen('game')} />;

  return (
    <Game
      user={user}
      onLogout={handleLogout}
      onAdmin={user?.is_admin ? () => setScreen('admin') : null}
    />
  );
}
