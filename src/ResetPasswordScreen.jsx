import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { updatePassword } from './supabase.js';

export default function ResetPasswordScreen({ onDone }) {
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (pwd.length < 6) { setError('6 caractères minimum.'); return; }
    if (pwd !== pwd2) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      const { error } = await updatePassword(pwd);
      if (error) setError(error.message);
      else onDone?.();
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
          <h1 className="serif" style={{ fontSize: 28, margin: '0 0 4px 0', lineHeight: 1.1 }}>Nouveau mot de passe</h1>
          <p style={{ fontSize: 13, color: '#71717A', margin: '8px 0 0 0' }}>Choisis un nouveau mot de passe pour ton compte.</p>
        </div>

        <form onSubmit={submit} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              className="input"
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              autoComplete="new-password"
              placeholder="6 caractères min."
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Confirme le mot de passe</label>
            <input
              className="input"
              type="password"
              value={pwd2}
              onChange={e => setPwd2(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{ padding: 10, background: '#2A1A1A', border: '1px solid #F87171', borderRadius: 6, fontSize: 12, color: '#F87171' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy} style={{ justifyContent: 'center', padding: 14, marginTop: 4, opacity: busy ? 0.6 : 1 }}>
            {busy ? '⟳ ...' : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </div>
  );
}
