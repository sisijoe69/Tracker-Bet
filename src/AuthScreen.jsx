import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { signIn, signUp, resetPasswordForEmail } from './supabase.js';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!email) { setError('Email requis.'); return; }
    if (mode !== 'forgot' && !password) { setError('Mot de passe requis.'); return; }
    if (mode === 'signup' && password.length < 6) { setError('Mot de passe : 6 caractères minimum.'); return; }

    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error } = await resetPasswordForEmail(email.trim());
        if (error) setError(error.message);
        else setInfo('Email envoyé ! Vérifie ta boîte (et tes spams). Clique sur le lien pour choisir un nouveau mot de passe.');
      } else {
        const { error } = mode === 'signup'
          ? await signUp(email.trim(), password, displayName.trim() || email.split('@')[0])
          : await signIn(email.trim(), password);
        if (error) setError(error.message);
      }
    } catch (e) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const titles = {
    signin: 'Connecte-toi à ton compte',
    signup: 'Crée ton compte',
    forgot: 'Réinitialiser ton mot de passe',
  };
  const submitLabels = {
    signin: 'Se connecter',
    signup: 'Créer le compte',
    forgot: 'Envoyer le lien',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#FAFAF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Target size={40} style={{ color: '#D4A574', marginBottom: 12 }} />
          <h1 className="serif" style={{ fontSize: 32, margin: '0 0 4px 0', lineHeight: 1.1 }}>Bet Tracker<br/><span style={{ fontStyle: 'italic' }}>pour les boys</span></h1>
          <p style={{ fontSize: 13, color: '#71717A', margin: '8px 0 0 0' }}>{titles[mode]}</p>
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

          {mode !== 'forgot' && (
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
          )}

          {error && (
            <div style={{ padding: 10, background: '#2A1A1A', border: '1px solid #F87171', borderRadius: 6, fontSize: 12, color: '#F87171' }}>
              {error}
            </div>
          )}

          {info && (
            <div style={{ padding: 10, background: '#0F2A1F', border: '1px solid #4ADE80', borderRadius: 6, fontSize: 12, color: '#4ADE80' }}>
              {info}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy} style={{ justifyContent: 'center', padding: 14, marginTop: 4, opacity: busy ? 0.6 : 1 }}>
            {busy ? '⟳ ...' : submitLabels[mode]}
          </button>

          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => switchMode('forgot')} style={{ background: 'transparent', border: 'none', color: '#A1A1AA', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                Mot de passe oublié ?
              </button>
              <button type="button" onClick={() => switchMode('signup')} style={{ background: 'transparent', border: 'none', color: '#D4A574', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
                Créer un nouveau compte
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => switchMode('signin')} style={{ background: 'transparent', border: 'none', color: '#D4A574', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginTop: 4 }}>
              J'ai déjà un compte
            </button>
          )}
          {mode === 'forgot' && (
            <button type="button" onClick={() => switchMode('signin')} style={{ background: 'transparent', border: 'none', color: '#D4A574', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginTop: 4 }}>
              Retour à la connexion
            </button>
          )}
        </form>

        <p style={{ fontSize: 11, color: '#52525B', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          Tes données sont stockées de façon sécurisée et ne sont visibles que par toi.
        </p>
      </div>
    </div>
  );
}
