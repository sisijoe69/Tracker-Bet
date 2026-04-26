import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { signIn, signUp } from './supabase.js';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Email et mot de passe requis.'); return; }
    if (mode === 'signup' && password.length < 6) { setError('Mot de passe : 6 caractères minimum.'); return; }
    setBusy(true);
    try {
      const { error } = mode === 'signup'
        ? await signUp(email.trim(), password, displayName.trim() || email.split('@')[0])
        : await signIn(email.trim(), password);
      if (error) setError(error.message);
    } catch (e) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#FAFAF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Target size={40} style={{ color: '#D4A574', marginBottom: 12 }} />
          <h1 className="serif" style={{ fontSize: 36, margin: '0 0 4px 0' }}>Bet Tracker Pro</h1>
          <p style={{ fontSize: 13, color: '#71717A', margin: 0 }}>
            {mode === 'signup' ? 'Crée ton compte' : 'Connecte-toi à ton compte'}
          </p>
        </div>

        <form onSubmit={submit} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label className="label">Nom d'affichage</label>
              <input
                className="input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="ex: Alex"
                autoComplete="nickname"
              />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '6 caractères min.' : '••••••••'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {error && (
            <div style={{ padding: 10, background: '#2A1A1A', border: '1px solid #F87171', borderRadius: 6, fontSize: 12, color: '#F87171' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy} style={{ justifyContent: 'center', padding: 14, marginTop: 4, opacity: busy ? 0.6 : 1 }}>
            {busy ? '⟳ ...' : (mode === 'signup' ? 'Créer le compte' : 'Se connecter')}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }}
            style={{ background: 'transparent', border: 'none', color: '#D4A574', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginTop: 4 }}
          >
            {mode === 'signup' ? "J'ai déjà un compte" : "Créer un nouveau compte"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#52525B', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          Tes données sont stockées de façon sécurisée et ne sont visibles que par toi.
        </p>
      </div>
    </div>
  );
}
