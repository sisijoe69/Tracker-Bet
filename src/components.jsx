import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { calcProfit, formatOdds } from './utils.js';

export function StatCard({ label, value, accent }) {
  const colors = { green: '#4ADE80', red: '#F87171', gold: '#D4A574', neutral: '#FAFAF9' };
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 10, color: '#71717A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: colors[accent] }}>
        {value}
      </div>
    </div>
  );
}

export function HistoryView({ bets, currency, onUpdate, onDelete, onEdit }) {
  const [filter, setFilter] = useState('all');
  const filtered = bets.filter(b => filter === 'all' || b.status === filter);
  const statusLabels = { all: 'Tous', pending: 'En attente', won: 'Gagnés', lost: 'Perdus', push: 'Poussée' };

  return (
    <div className="fade-in">
      <h2 className="serif" style={{ margin: '0 0 16px 0', fontSize: 28 }}>Historique</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {Object.entries(statusLabels).map(([k, v]) => (
          <button
            key={k} onClick={() => setFilter(k)}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: filter === k ? '#D4A574' : 'transparent',
              color: filter === k ? '#0A0A0B' : '#A1A1AA',
              border: `1px solid ${filter === k ? '#D4A574' : '#2A2A2F'}`,
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >{v}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#71717A', fontSize: 13 }}>
          Aucun pari dans cette catégorie.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(b => <BetCard key={b.id} bet={b} currency={currency} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />)}
        </div>
      )}
    </div>
  );
}

export function BetCard({ bet, currency, onUpdate, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const profit = calcProfit(bet.stake, bet.odds, bet.status);
  const isParlay = bet.betType === 'Parlay' || (bet.legs && bet.legs.length > 0);
  const statusColors = { pending: '#A1A1AA', won: '#4ADE80', lost: '#F87171', push: '#D4A574', void: '#A1A1AA' };
  const statusLabel = { pending: 'En attente', won: 'Gagné', lost: 'Perdu', push: 'Poussée', void: 'Annulé' };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, background: isParlay ? '#2A1F0A' : '#2A2A2F', color: isParlay ? '#D4A574' : '#A1A1AA', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>
                {isParlay ? '🎯 PARLAY' : bet.sport}
              </span>
              <span style={{ fontSize: 11, color: '#71717A' }}>
                {new Date(bet.date).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{bet.description}</div>
            {!isParlay && <div style={{ fontSize: 12, color: '#71717A' }}>{bet.match}</div>}
            {isParlay && bet.legs && (
              <div style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{bet.legs.length} jambes · {bet.legs.map(l => l.sport).join(' + ')}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', marginLeft: 12 }}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: statusColors[bet.status] }}>
              {bet.status === 'pending' ? formatOdds(bet.odds) : (profit >= 0 ? '+' : '') + profit.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: statusColors[bet.status], marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              {statusLabel[bet.status]}
            </div>
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: '#71717A' }}>
          {bet.stake} {currency} @ {formatOdds(bet.odds)}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #222226' }}>
          {bet.notes && (
            <div style={{ fontSize: 12, color: '#A1A1AA', marginBottom: 12, fontStyle: 'italic' }}>
              « {bet.notes} »
            </div>
          )}
          {isParlay && bet.legs && bet.legs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Jambes du parlay</div>
              {bet.legs.map((leg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #1F1F22' }}>
                  <div>
                    <span style={{ fontSize: 10, background: '#2A2A2F', color: '#A1A1AA', padding: '1px 6px', borderRadius: 3, fontWeight: 700, marginRight: 6, textTransform: 'uppercase' }}>{leg.sport}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{leg.description}</span>
                    {leg.match && <div style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{leg.match}</div>}
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: '#D4A574', fontWeight: 700, marginLeft: 8 }}>{formatOdds(leg.odds)}</span>
                </div>
              ))}
            </div>
          )}
          {bet.status === 'pending' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => onUpdate(bet.id, 'won')} style={{ flex: 1, background: '#4ADE80', color: '#0A0A0B', border: 'none', padding: '8px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Gagné</button>
              <button onClick={() => onUpdate(bet.id, 'lost')} style={{ flex: 1, background: '#F87171', color: '#0A0A0B', border: 'none', padding: '8px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✗ Perdu</button>
              <button onClick={() => onUpdate(bet.id, 'push')} style={{ flex: 1, background: 'transparent', color: '#D4A574', border: '1px solid #D4A574', padding: '8px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>— Push</button>
            </div>
          ) : (
            <button onClick={() => onUpdate(bet.id, 'pending')} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              ↩ Réinitialiser
            </button>
          )}
          <button onClick={() => onEdit(bet)} style={{ width: '100%', marginTop: 8, background: 'transparent', color: '#D4A574', border: '1px solid #D4A574', padding: '8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit' }}>
            ✏️ Modifier
          </button>
          <button onClick={() => {
            if (confirm('Supprimer ce pari?')) onDelete(bet.id);
          }} style={{ width: '100%', marginTop: 8, background: 'transparent', color: '#71717A', border: '1px solid #2A2A2F', padding: '8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit' }}>
            🗑 Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

export function renderGames(games, gamesError, form, setForm, setShowGamesList) {
  if (!games.length && !gamesError) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {gamesError && <div style={{ padding: 10, background: '#2A1A1A', border: '1px solid #F87171', borderRadius: 6, fontSize: 11, color: '#F87171' }}>{gamesError}</div>}
      {!gamesError && games.length === 0 && <div style={{ padding: 10, background: '#141416', border: '1px solid #2A2A2F', borderRadius: 6, fontSize: 12, color: '#71717A', textAlign: 'center' }}>Aucun match trouvé.</div>}
      {games.length > 0 && (
        <div style={{ maxHeight: 190, overflowY: 'auto', border: '1px solid #2A2A2F', borderRadius: 6, background: '#0A0A0B' }}>
          {games.map(g => {
            const sc = g.state === 'in' ? '#4ADE80' : g.state === 'post' ? '#71717A' : '#A1A1AA';
            const lbl = g.state === 'in' ? '🔴 LIVE' : g.state === 'post' ? `✓ ${g.statusDetail || 'Fin'}` : g.localTime;
            return (
              <button key={g.id} onClick={() => { setForm(f => ({ ...f, match: g.name })); setShowGamesList(false); }} style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #1A1A1E', color: '#FAFAF9', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{g.name}</span>
                <span style={{ fontSize: 10, color: sc, whiteSpace: 'nowrap', marginLeft: 8, textTransform: 'uppercase' }}>{lbl}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SettingsView({ data, onUpdate, onReset, onExport, onImport }) {
  const [local, setLocal] = useState(data.settings);

  const save = () => {
    onUpdate({
      initialBankroll: Number(local.initialBankroll),
      unitSizePercent: Number(local.unitSizePercent),
      currency: local.currency,
    });
    alert('Paramètres sauvegardés.');
  };

  const unitValue = (local.initialBankroll * local.unitSizePercent) / 100;

  return (
    <div className="fade-in">
      <h2 className="serif" style={{ margin: '0 0 20px 0', fontSize: 28 }}>Réglages</h2>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: 15 }}>Gestion de Bankroll</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#71717A' }}>
          Les pros recommandent 1-2% par pari. Ne jamais dépasser 5%.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Bankroll de départ</label>
          <input className="input mono" type="number" value={local.initialBankroll} onChange={e => setLocal({ ...local, initialBankroll: e.target.value })} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Taille d'unité (% du bankroll)</label>
          <input className="input mono" type="number" step="0.1" value={local.unitSizePercent} onChange={e => setLocal({ ...local, unitSizePercent: e.target.value })} />
          <div style={{ fontSize: 11, color: '#D4A574', marginTop: 6 }} className="mono">
            1 unité = {unitValue.toFixed(2)} {local.currency}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label">Devise</label>
          <select className="input" value={local.currency} onChange={e => setLocal({ ...local, currency: e.target.value })}>
            <option>CAD</option><option>USD</option><option>EUR</option><option>GBP</option>
          </select>
        </div>

        <button onClick={save} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Sauvegarder
        </button>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>Données</h3>
        <button onClick={onExport} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
          <Download size={14} /> Exporter JSON (backup)
        </button>
        <label className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 8, cursor: 'pointer' }}>
          📥 Importer JSON
          <input type="file" accept=".json" onChange={onImport} style={{ display: 'none' }} />
        </label>
        <button onClick={onReset} style={{ width: '100%', background: 'transparent', color: '#F87171', border: '1px solid #F87171', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Tout effacer
        </button>
      </div>

      <div className="card" style={{ padding: 16, borderLeft: '3px solid #D4A574' }}>
        <div style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.6 }}>
          <strong style={{ color: '#FAFAF9' }}>💡 Règles d'or du parieur pro :</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 18 }}>
            <li>Ne jamais chasser les pertes</li>
            <li>Taille d'unité constante (flat betting)</li>
            <li>Tracker chaque pari, incluant le raisonnement</li>
            <li>Réviser les résultats mensuellement</li>
            <li>Break-even = 52,4% à -110</li>
            <li>Parier ce que tu peux te permettre de perdre</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
