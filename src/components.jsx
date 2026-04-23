import React, { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
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

export function CalendarView({ bets, currency }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const dailyPnL = useMemo(() => {
    const map = {};
    bets.forEach(b => {
      if (b.status === 'pending') return;
      const profit = calcProfit(b.stake, b.odds, b.status);
      const key = b.date;
      if (!map[key]) map[key] = { pnl: 0, count: 0 };
      map[key].pnl += profit;
      map[key].count += 1;
    });
    return map;
  }, [bets]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const offset = (startWeekday + 6) % 7;

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = firstDay.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const prevMonth = () => setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });
  const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth() });

  const monthStats = Object.entries(dailyPnL).reduce((acc, [k, v]) => {
    const [y, m] = k.split('-').map(Number);
    if (y === cursor.year && m - 1 === cursor.month) {
      acc.total += v.pnl;
      acc.bets += v.count;
      if (v.pnl > 0) acc.greenDays += 1;
      else if (v.pnl < 0) acc.redDays += 1;
    }
    return acc;
  }, { total: 0, bets: 0, greenDays: 0, redDays: 0 });

  const dayHeaders = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const navBtn = { background: 'transparent', border: '1px solid #2A2A2F', color: '#A1A1AA', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div className="fade-in">
      <h2 className="serif" style={{ margin: '0 0 16px 0', fontSize: 28 }}>Calendrier</h2>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={prevMonth} style={navBtn} aria-label="Mois précédent"><ChevronLeft size={18} /></button>
          <div style={{ textAlign: 'center' }}>
            <div className="serif" style={{ fontSize: 20 }}>{monthLabelCap}</div>
            <button onClick={goToday} style={{ background: 'transparent', border: 'none', color: '#D4A574', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginTop: 2 }}>Aujourd'hui</button>
          </div>
          <button onClick={nextMonth} style={navBtn} aria-label="Mois suivant"><ChevronRight size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {dayHeaders.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: '#71717A', fontWeight: 600, letterSpacing: '.1em', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} style={{ aspectRatio: '1', background: 'transparent' }} />;
            const key = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = dailyPnL[key];
            const isToday = key === todayKey;
            let bg = '#141416';
            let border = '1px solid #222226';
            let pnlColor = '#52525B';
            if (entry) {
              if (entry.pnl > 0) { bg = 'rgba(74,222,128,0.12)'; border = '1px solid rgba(74,222,128,0.35)'; pnlColor = '#4ADE80'; }
              else if (entry.pnl < 0) { bg = 'rgba(248,113,113,0.12)'; border = '1px solid rgba(248,113,113,0.35)'; pnlColor = '#F87171'; }
              else { bg = '#1C1C1F'; border = '1px solid #2A2A2F'; pnlColor = '#A1A1AA'; }
            }
            if (isToday) border = '1px solid #D4A574';
            return (
              <div key={idx} style={{ aspectRatio: '1', background: bg, border, borderRadius: 8, padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: entry ? '#FAFAF9' : '#71717A', textAlign: 'right' }}>{day}</div>
                {entry && (
                  <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: pnlColor, textAlign: 'center', lineHeight: 1.1 }}>
                    {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(Math.abs(entry.pnl) >= 100 ? 0 : 1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Bilan du mois</span>
          <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: monthStats.total >= 0 ? '#4ADE80' : '#F87171' }}>
            {monthStats.total >= 0 ? '+' : ''}{monthStats.total.toFixed(2)} {currency}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ padding: 10, background: '#0A0A0B', border: '1px solid #2A2A2F', borderRadius: 8, textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#4ADE80' }}>{monthStats.greenDays}</div>
            <div style={{ fontSize: 10, color: '#71717A', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>Jours +</div>
          </div>
          <div style={{ padding: 10, background: '#0A0A0B', border: '1px solid #2A2A2F', borderRadius: 8, textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#F87171' }}>{monthStats.redDays}</div>
            <div style={{ fontSize: 10, color: '#71717A', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>Jours −</div>
          </div>
          <div style={{ padding: 10, background: '#0A0A0B', border: '1px solid #2A2A2F', borderRadius: 8, textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#FAFAF9' }}>{monthStats.bets}</div>
            <div style={{ fontSize: 10, color: '#71717A', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>Paris</div>
          </div>
        </div>
      </div>
    </div>
  );
}
