import React, { useState } from 'react';

export default function Login({ onLogin, themeColor }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      onLogin();
    } else {
      setError('Identifiants incorrects');
    }
  };

  return (
    <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="header-banner" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', color: themeColor || 'var(--accent-yellow)' }}>AI LOADING</h1>
        <div className="scan-label" style={{ textAlign: 'center', marginBottom: '24px' }}>AUTHENTIFICATION SECURISEE</div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Utilisateur</label>
            <input 
              type="text" 
              className="kinetic-input" 
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mot de passe</label>
            <input 
              type="password" 
              className="kinetic-input" 
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          {error && <div style={{ color: 'var(--accent-red)', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
          
          <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '12px', width: '100%', cursor: 'pointer', border: 'none' }}>
            CONNEXION
          </button>
        </form>
      </div>
    </div>
  );
}
