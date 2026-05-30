import React, { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight, LogOut, Flame, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { calcProfit, formatOdds, parseLocalDate, juiceCategory, calcCLV, MARKET_TYPES, SIGNALS, GRADES, gradeColor, gradeRank } from './utils.js';

const MARKET_LABEL = Object.fromEntries(MARKET_TYPES.map(m => [m.k, m.l]));
const SIGNAL_LABEL = Object.fromEntries(SIGNALS.map(s => [s.k, s.l]));

export function PeriodFilter({ period, onChange }) {
  const opts = [
    { k: '7d', l: '7 jours' },
    { k: '30d', l: '30 jours' },
    { k: '90d', l: '90 jours' },
    { k: 'all', l: 'Tout' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, padding: 4, background: '#141416', border: '1px solid #222226', borderRadius: 10 }}>
      {opts.map(o => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          style={{
            flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: 12,
            background: period === o.k ? '#D4A574' : 'transparent',
            color: period === o.k ? '#0A0A0B' : '#A1A1AA',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            transition: 'all .15s',
          }}
        >{o.l}</button>
      ))}
    </div>
  );
}

export function AdvancedStats({ bets, currency }) {
  const m = useMemo(() => {
    const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
    if (settled.length === 0) return null;

    const sortedByDateDesc = [...settled].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
    let currentStreak = 0;
    let currentType = sortedByDateDesc[0].status;
    for (const b of sortedByDateDesc) {
      if (b.status === currentType) currentStreak++;
      else break;
    }

    const sortedByDateAsc = [...settled].sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
    let longestWin = 0, longestLoss = 0, runWin = 0, runLoss = 0;
    for (const b of sortedByDateAsc) {
      if (b.status === 'won') { runWin++; runLoss = 0; longestWin = Math.max(longestWin, runWin); }
      else { runLoss++; runWin = 0; longestLoss = Math.max(longestLoss, runLoss); }
    }

    const profits = settled.map(b => ({ p: calcProfit(b.stake, b.odds, b.status), bet: b }));
    const biggestWin = profits.reduce((max, x) => x.p > max.p ? x : max, { p: -Infinity });
    const biggestLoss = profits.reduce((min, x) => x.p < min.p ? x : min, { p: Infinity });

    const stakes = bets.map(b => Number(b.stake)).filter(s => s > 0);
    const avgStake = stakes.length ? stakes.reduce((s, v) => s + v, 0) / stakes.length : 0;

    const oddsList = bets.map(b => Number(b.odds)).filter(o => o !== 0 && !isNaN(o));
    const avgOdds = oddsList.length ? oddsList.reduce((s, v) => s + v, 0) / oddsList.length : 0;

    return {
      currentStreak, currentType,
      longestWin, longestLoss,
      biggestWin: biggestWin.p === -Infinity ? null : biggestWin,
      biggestLoss: biggestLoss.p === Infinity ? null : biggestLoss,
      avgStake, avgOdds,
    };
  }, [bets]);

  if (!m) return null;

  const Row = ({ icon, label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1F1F22' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon}
        <span style={{ fontSize: 13, color: '#A1A1AA' }}>{label}</span>
      </div>
      <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: color || '#FAFAF9' }}>{value}</span>
    </div>
  );

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <h3 className="serif" style={{ margin: '0 0 12px 0', fontSize: 22 }}>Stats détaillées</h3>

      <Row
        icon={<Flame size={14} style={{ color: m.currentType === 'won' ? '#4ADE80' : '#F87171' }} />}
        label="Série en cours"
        value={`${m.currentStreak} ${m.currentType === 'won' ? 'gagné' + (m.currentStreak > 1 ? 's' : '') : 'perdu' + (m.currentStreak > 1 ? 's' : '')}`}
        color={m.currentType === 'won' ? '#4ADE80' : '#F87171'}
      />
      <Row
        icon={<Trophy size={14} style={{ color: '#4ADE80' }} />}
        label="Plus longue série gagnante"
        value={`${m.longestWin}`}
        color="#4ADE80"
      />
      <Row
        icon={<Trophy size={14} style={{ color: '#F87171' }} />}
        label="Plus longue série perdante"
        value={`${m.longestLoss}`}
        color="#F87171"
      />
      {m.biggestWin && (
        <Row
          icon={<TrendingUp size={14} style={{ color: '#4ADE80' }} />}
          label="Plus gros gain"
          value={`+${m.biggestWin.p.toFixed(2)} ${currency}`}
          color="#4ADE80"
        />
      )}
      {m.biggestLoss && m.biggestLoss.p < 0 && (
        <Row
          icon={<TrendingDown size={14} style={{ color: '#F87171' }} />}
          label="Plus grosse perte"
          value={`${m.biggestLoss.p.toFixed(2)} ${currency}`}
          color="#F87171"
        />
      )}
      <Row label="Mise moyenne" value={`${m.avgStake.toFixed(2)} ${currency}`} icon={<span style={{ width: 14 }} />} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 14 }} />
          <span style={{ fontSize: 13, color: '#A1A1AA' }}>Cote moyenne</span>
        </div>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#FAFAF9' }}>
          {m.avgOdds > 0 ? '+' : ''}{Math.round(m.avgOdds)}
        </span>
      </div>
    </div>
  );
}

export function BetTypeBreakdown({ bets, currency }) {
  const groups = useMemo(() => {
    const g = {
      single: { count: 0, wins: 0, losses: 0, profit: 0, staked: 0 },
      parlay: { count: 0, wins: 0, losses: 0, profit: 0, staked: 0 },
    };
    bets.forEach(b => {
      if (b.status === 'pending') return;
      const isParlay = b.betType === 'Parlay' || (b.legs && b.legs.length > 0);
      const k = isParlay ? 'parlay' : 'single';
      g[k].count++;
      if (b.status === 'won') g[k].wins++;
      if (b.status === 'lost') g[k].losses++;
      if (b.status === 'won' || b.status === 'lost') g[k].staked += Number(b.stake || 0);
      g[k].profit += calcProfit(b.stake, b.odds, b.status);
    });
    ['single', 'parlay'].forEach(k => {
      g[k].roi = g[k].staked > 0 ? (g[k].profit / g[k].staked) * 100 : 0;
      g[k].winRate = (g[k].wins + g[k].losses) > 0 ? (g[k].wins / (g[k].wins + g[k].losses)) * 100 : 0;
    });
    return g;
  }, [bets]);

  if (groups.single.count === 0 && groups.parlay.count === 0) return null;

  const Block = ({ label, emoji, g }) => {
    if (g.count === 0) return null;
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>
          {emoji} {label}
        </div>
        <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: g.profit >= 0 ? '#4ADE80' : '#F87171', marginBottom: 4 }}>
          {g.profit >= 0 ? '+' : ''}{g.profit.toFixed(2)}
        </div>
        <div style={{ fontSize: 11, color: '#A1A1AA', lineHeight: 1.5 }}>
          {g.count} pari{g.count > 1 ? 's' : ''}<br />
          {g.wins}W-{g.losses}L · {g.winRate.toFixed(0)}%<br />
          ROI <span className="mono" style={{ color: g.roi >= 0 ? '#4ADE80' : '#F87171', fontWeight: 600 }}>{g.roi >= 0 ? '+' : ''}{g.roi.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <h3 className="serif" style={{ margin: '0 0 16px 0', fontSize: 22 }}>Singles vs Parlays</h3>
      <div style={{ display: 'flex', gap: 16 }}>
        <Block label="Singles" emoji="🎯" g={groups.single} />
        <div style={{ width: 1, background: '#222226' }} />
        <Block label="Parlays" emoji="🎯🎯" g={groups.parlay} />
      </div>
    </div>
  );
}

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
                {parseLocalDate(bet.date).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
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
          {bet.closingOdds != null && (
            <> → closing {formatOdds(bet.closingOdds)}{(() => {
              const clv = calcCLV(bet.odds, bet.closingOdds);
              if (clv == null) return null;
              const color = clv >= 2 ? '#4ADE80' : clv <= -1 ? '#F87171' : '#A1A1AA';
              return <span style={{ color, fontWeight: 700, marginLeft: 6 }}>· CLV {clv >= 0 ? '+' : ''}{clv.toFixed(1)}% {clv >= 2 ? '✅' : clv <= -1 ? '⚠️' : ''}</span>;
            })()}</>
          )}
        </div>
        {(bet.marketType || bet.grade || (bet.signals && bet.signals.length > 0)) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {bet.grade && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: gradeColor(bet.grade), color: '#0A0A0B', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '.02em' }}>
                {bet.grade}
              </span>
            )}
            {bet.marketType && (
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: '#1C1C1F', border: '1px solid #2A2A2F', color: '#D4A574', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>
                {MARKET_LABEL[bet.marketType] || bet.marketType}
              </span>
            )}
            {(bet.signals || []).map(s => (
              <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'transparent', border: '1px solid #2A2A2F', color: '#A1A1AA', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                {SIGNAL_LABEL[s] || s}
              </span>
            ))}
          </div>
        )}
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

export function SettingsView({ data, displayName, onUpdate, onReset, onExport, onImport, onLogout }) {
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

      {displayName && (
        <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 4 }}>Connecté en tant que</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName}</div>
          </div>
          {onLogout && (
            <button onClick={onLogout} style={{ background: 'transparent', color: '#F87171', border: '1px solid #F87171', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontWeight: 600 }}>
              <LogOut size={14} /> Déconnexion
            </button>
          )}
        </div>
      )}

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

export function CalendarView({ bets, currency, onUpdate, onDelete, onEdit, onAddBet }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(null);

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
              <button
                key={idx}
                onClick={() => setSelectedDate(key)}
                style={{ aspectRatio: '1', background: bg, border, borderRadius: 8, padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .1s' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(.95)'}
                onMouseUp={e => e.currentTarget.style.transform = ''}
                onMouseLeave={e => e.currentTarget.style.transform = ''}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: entry ? '#FAFAF9' : '#71717A', textAlign: 'right', width: '100%' }}>{day}</div>
                {entry && (
                  <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: pnlColor, textAlign: 'center', lineHeight: 1.1, width: '100%' }}>
                    {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(Math.abs(entry.pnl) >= 100 ? 0 : 1)}
                  </div>
                )}
              </button>
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

      {selectedDate && (
        <DayBetsModal
          date={selectedDate}
          bets={bets.filter(b => b.date === selectedDate)}
          currency={currency}
          onClose={() => setSelectedDate(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onEdit={(bet) => { setSelectedDate(null); onEdit?.(bet); }}
          onAddBet={onAddBet ? (date) => { setSelectedDate(null); onAddBet(date); } : null}
        />
      )}
    </div>
  );
}

function DayBetsModal({ date, bets, currency, onClose, onUpdate, onDelete, onEdit, onAddBet }) {
  const d = parseLocalDate(date);
  const label = d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
  const dayPnL = bets.reduce((s, b) => s + calcProfit(b.stake, b.odds, b.status), 0);
  const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
  const wins = bets.filter(b => b.status === 'won').length;
  const losses = bets.filter(b => b.status === 'lost').length;
  const pending = bets.filter(b => b.status === 'pending').length;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: '#141416', borderTop: '1px solid #2A2A2F', width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto', borderRadius: '20px 20px 0 0', padding: 24, paddingBottom: 'max(24px,env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 4 }}>Journée</div>
            <h2 className="serif" style={{ fontSize: 22, margin: 0 }}>{labelCap}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: 22, padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {onAddBet && (
          <button
            onClick={() => onAddBet(date)}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 12, marginBottom: 16, fontSize: 14 }}
          >
            + Ajouter un pari pour ce jour
          </button>
        )}

        {bets.length > 0 ? (
          <>
            <div className="card-elevated" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>P&L du jour</span>
                <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: dayPnL > 0 ? '#4ADE80' : dayPnL < 0 ? '#F87171' : '#A1A1AA' }}>
                  {dayPnL >= 0 ? '+' : ''}{dayPnL.toFixed(2)} {currency}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#A1A1AA' }}>
                <span>{bets.length} pari{bets.length > 1 ? 's' : ''}</span>
                {settled.length > 0 && <span>· {wins}W-{losses}L</span>}
                {pending > 0 && <span>· {pending} en attente</span>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bets.map(b => (
                <BetCard key={b.id} bet={b} currency={currency} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717A' }}>
            <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }}>📭</div>
            <p style={{ margin: 0, fontSize: 14 }}>Aucun pari ce jour.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CLVCard({ bets }) {
  const stats = useMemo(() => {
    const tracked = bets.filter(b => b.closingOdds != null && b.odds != null);
    if (tracked.length === 0) return null;

    const clvs = tracked.map(b => ({ clv: calcCLV(b.odds, b.closingOdds), bet: b })).filter(x => x.clv != null);
    if (clvs.length === 0) return null;

    const avg = clvs.reduce((s, x) => s + x.clv, 0) / clvs.length;

    const bySport = {};
    for (const x of clvs) {
      const k = x.bet.sport || 'Autre';
      if (!bySport[k]) bySport[k] = { sum: 0, n: 0 };
      bySport[k].sum += x.clv;
      bySport[k].n += 1;
    }
    const sportRows = Object.entries(bySport)
      .map(([sport, v]) => ({ sport, avg: v.sum / v.n, n: v.n }))
      .sort((a, b) => b.avg - a.avg);

    return { avg, tracked: clvs.length, total: bets.length, sportRows };
  }, [bets]);

  if (!stats) return null;

  const verdict = (clv, n) => {
    if (n < 50) return { label: `⏳ encore ${50 - n} bets pour confiance`, color: '#A1A1AA' };
    if (clv >= 2) return { label: '✅ EDGE CONFIRMÉ', color: '#4ADE80' };
    if (clv <= -1) return { label: '⚠️ FADE', color: '#F87171' };
    return { label: '🟡 ZONE GRISE', color: '#D4A574' };
  };

  const v = verdict(stats.avg, stats.tracked);

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h3 className="serif" style={{ margin: 0, fontSize: 22 }}>CLV</h3>
        <span style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em' }}>Closing Line Value</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#71717A' }}>CLV moyen</span>
        <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: stats.avg >= 2 ? '#4ADE80' : stats.avg <= -1 ? '#F87171' : '#FAFAF9' }}>
          {stats.avg >= 0 ? '+' : ''}{stats.avg.toFixed(2)}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#71717A', marginBottom: 4 }}>
        <span>Volume tracké</span>
        <span className="mono">{stats.tracked} / {stats.total}</span>
      </div>
      <div style={{ fontSize: 11, color: v.color, fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: '1px solid #1F1F22' }}>
        {v.label}
      </div>

      {stats.sportRows.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Par sport</div>
          {stats.sportRows.map(r => {
            const c = r.avg >= 2 ? '#4ADE80' : r.avg <= -1 ? '#F87171' : '#A1A1AA';
            const icon = r.avg >= 2 ? '✅' : r.avg <= -1 ? '⚠️' : '·';
            return (
              <div key={r.sport} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1F1F22' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{r.sport}</span>
                <span className="mono" style={{ fontSize: 12, color: c, fontWeight: 700 }}>
                  {r.avg >= 0 ? '+' : ''}{r.avg.toFixed(1)}% {icon} <span style={{ color: '#71717A', fontWeight: 400 }}>({r.n})</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function avgCLVOf(bets) {
  const xs = bets.map(b => calcCLV(b.odds, b.closingOdds)).filter(x => x != null);
  if (xs.length === 0) return null;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function roiConfidence(bets) {
  const settled = bets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'push' || b.status === 'void');
  const realised = settled.filter(b => Number(b.stake) > 0);
  if (realised.length < 5) return null;
  const perBetROI = realised.map(b => calcProfit(b.stake, b.odds, b.status) / Number(b.stake));
  const mean = perBetROI.reduce((s, v) => s + v, 0) / perBetROI.length;
  const variance = perBetROI.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(perBetROI.length - 1, 1);
  const se = Math.sqrt(variance / perBetROI.length);
  return {
    n: realised.length,
    roi: mean * 100,
    lower: (mean - 1.96 * se) * 100,
    upper: (mean + 1.96 * se) * 100,
    profitable: (mean - 1.96 * se) > 0,
    inconclusive: (mean - 1.96 * se) <= 0 && (mean + 1.96 * se) >= 0,
  };
}

function projectionStats(bets, currentBankroll) {
  const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
  if (settled.length < 5) return null;
  const dates = bets.map(b => parseLocalDate(b.date).getTime()).filter(Boolean);
  if (dates.length === 0) return null;
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const spanDays = Math.max(1, (maxDate - minDate) / 86400000 + 1);
  const totalStaked = settled.reduce((s, b) => s + Number(b.stake || 0), 0);
  const totalProfit = bets.reduce((s, b) => s + calcProfit(b.stake, b.odds, b.status), 0);
  const stakedPerDay = totalStaked / spanDays;
  const actualROI = totalStaked > 0 ? totalProfit / totalStaked : 0;
  const clv = avgCLVOf(bets);
  const projectedROI = clv != null ? clv / 100 : actualROI / 2;
  const perBetROI = settled.map(b => calcProfit(b.stake, b.odds, b.status) / Number(b.stake));
  const meanROI = perBetROI.reduce((s, v) => s + v, 0) / perBetROI.length;
  const variance = perBetROI.reduce((s, v) => s + Math.pow(v - meanROI, 2), 0) / Math.max(perBetROI.length - 1, 1);
  const stdev = Math.sqrt(variance);
  const avgStake = totalStaked / settled.length;
  const horizons = [30, 90, 365];
  return horizons.map(days => {
    const futureStake = stakedPerDay * days;
    const futureBets = settled.length > 0 ? (futureStake / avgStake) : 0;
    const expectedActual = futureStake * actualROI;
    const expectedProjected = futureStake * projectedROI;
    const sigma = stdev * Math.sqrt(futureBets) * avgStake;
    return {
      days,
      futureStake,
      bankrollActual: currentBankroll + expectedActual,
      bankrollProjected: currentBankroll + expectedProjected,
      bankrollLow: currentBankroll + expectedProjected - 1.96 * sigma,
      bankrollHigh: currentBankroll + expectedProjected + 1.96 * sigma,
    };
  });
}

function stakeBucketStats(bets, unitSize) {
  if (!unitSize || unitSize <= 0) return null;
  const buckets = [
    { label: '0.5u – 1.0u', min: 0.5, max: 1.0, bets: [] },
    { label: '1.0u – 1.5u', min: 1.0, max: 1.5, bets: [] },
    { label: '1.5u – 2.5u', min: 1.5, max: 2.5, bets: [] },
    { label: '2.5u +', min: 2.5, max: Infinity, bets: [] },
  ];
  bets.forEach(b => {
    const u = Number(b.stake) / unitSize;
    const bk = buckets.find(x => u >= x.min && u < x.max);
    if (bk) bk.bets.push(b);
  });
  return buckets.filter(b => b.bets.length > 0).map(b => ({ label: b.label, s: rowStats(b.bets) }));
}

function chasingStats(bets) {
  const sorted = bets
    .filter(b => b.status === 'won' || b.status === 'lost')
    .slice()
    .sort((a, b) => {
      const da = parseLocalDate(a.date) - parseLocalDate(b.date);
      if (da !== 0) return da;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb;
    });
  if (sorted.length < 10) return null;
  const afterWin = [], afterLoss = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].status === 'won') afterWin.push(sorted[i]);
    else if (sorted[i - 1].status === 'lost') afterLoss.push(sorted[i]);
  }
  if (afterWin.length < 3 || afterLoss.length < 3) return null;
  const avgStake = arr => arr.reduce((s, b) => s + Number(b.stake || 0), 0) / arr.length;
  return {
    afterWin: { stake: avgStake(afterWin), s: rowStats(afterWin) },
    afterLoss: { stake: avgStake(afterLoss), s: rowStats(afterLoss) },
  };
}

function rowStats(bets) {
  const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
  const wins = settled.filter(b => b.status === 'won').length;
  const losses = settled.filter(b => b.status === 'lost').length;
  const profit = bets.reduce((s, b) => s + calcProfit(b.stake, b.odds, b.status), 0);
  const staked = settled.reduce((s, b) => s + Number(b.stake || 0), 0);
  const roi = staked > 0 ? (profit / staked) * 100 : 0;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const clv = avgCLVOf(bets);
  return { count: bets.length, wins, losses, profit, roi, winRate, clv };
}

function verdictTag(roi, clv, n) {
  if (n < 5) return { label: 'small sample', color: '#71717A' };
  if (clv != null && clv >= 2 && roi >= 5) return { label: 'EDGE CONFIRMÉ 🔥', color: '#4ADE80' };
  if (clv != null && clv >= 1) return { label: 'EDGE', color: '#4ADE80' };
  if (clv != null && clv <= -1) return { label: 'FADE', color: '#F87171' };
  if (roi >= 10) return { label: 'HOT (vérifier CLV)', color: '#D4A574' };
  if (roi <= -5) return { label: 'cold', color: '#F87171' };
  return null;
}

function BreakdownSection({ title, rows, currency }) {
  if (rows.length === 0) return null;
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 className="serif" style={{ margin: '0 0 10px 0', fontSize: 18 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => {
          const v = verdictTag(r.s.roi, r.s.clv, r.s.count);
          return (
            <div key={r.label} style={{ padding: '8px 10px', background: '#0A0A0B', border: '1px solid #1F1F22', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: r.s.profit >= 0 ? '#4ADE80' : '#F87171' }}>
                  {r.s.profit >= 0 ? '+' : ''}{r.s.profit.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: '#A1A1AA' }}>
                <span>{r.s.count} bet{r.s.count > 1 ? 's' : ''}</span>
                <span>· {r.s.wins}W-{r.s.losses}L</span>
                <span>· ROI <span className="mono" style={{ color: r.s.roi >= 0 ? '#4ADE80' : '#F87171', fontWeight: 600 }}>{r.s.roi >= 0 ? '+' : ''}{r.s.roi.toFixed(1)}%</span></span>
                {r.s.clv != null && (
                  <span>· CLV <span className="mono" style={{ color: r.s.clv >= 2 ? '#4ADE80' : r.s.clv <= -1 ? '#F87171' : '#A1A1AA', fontWeight: 600 }}>{r.s.clv >= 0 ? '+' : ''}{r.s.clv.toFixed(1)}%</span></span>
                )}
                {v && <span style={{ color: v.color, fontWeight: 700 }}>· {v.label}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ROIConfidenceCard({ bets }) {
  const ci = useMemo(() => roiConfidence(bets), [bets]);
  if (!ci) return null;
  const status = ci.profitable
    ? { label: '✅ Profitable confirmé', color: '#4ADE80' }
    : ci.inconclusive
      ? { label: '⏳ Inconclusif (variance)', color: '#D4A574' }
      : { label: '⚠️ Probablement non profitable', color: '#F87171' };
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 className="serif" style={{ margin: '0 0 8px 0', fontSize: 18 }}>Confiance sur le ROI</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#71717A' }}>ROI mesuré (n={ci.n})</span>
        <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: ci.roi >= 0 ? '#4ADE80' : '#F87171' }}>
          {ci.roi >= 0 ? '+' : ''}{ci.roi.toFixed(1)}%
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 8 }}>
        Intervalle de confiance 95% :
        <span className="mono" style={{ color: '#FAFAF9', marginLeft: 6 }}>
          [{ci.lower >= 0 ? '+' : ''}{ci.lower.toFixed(1)}% à {ci.upper >= 0 ? '+' : ''}{ci.upper.toFixed(1)}%]
        </span>
      </div>
      <div style={{ position: 'relative', height: 8, background: '#1C1C1F', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        {(() => {
          const span = Math.max(50, Math.abs(ci.lower), Math.abs(ci.upper));
          const left = ((ci.lower + span) / (2 * span)) * 100;
          const width = ((ci.upper - ci.lower) / (2 * span)) * 100;
          const zero = (span / (2 * span)) * 100;
          return <>
            <div style={{ position: 'absolute', left: `${zero}%`, top: 0, bottom: 0, width: 1, background: '#52525B' }} />
            <div style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0, background: status.color, opacity: 0.6 }} />
          </>;
        })()}
      </div>
      <div style={{ fontSize: 11, color: status.color, fontWeight: 700 }}>{status.label}</div>
    </div>
  );
}

function CLVProjectionCard({ bets }) {
  const data = useMemo(() => {
    const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
    if (settled.length < 5) return null;
    const totalStaked = settled.reduce((s, b) => s + Number(b.stake || 0), 0);
    const totalProfit = bets.reduce((s, b) => s + calcProfit(b.stake, b.odds, b.status), 0);
    const actualROI = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
    const clv = avgCLVOf(bets);
    if (clv == null) return null;
    return { actualROI, projectedROI: clv, gap: actualROI - clv };
  }, [bets]);

  if (!data) return null;

  const verdict = data.gap > 10
    ? { label: '⚠️ Variance positive importante — régression attendue', color: '#F87171' }
    : data.gap < -10
      ? { label: '🍀 Variance négative — tu sous-performes ton edge', color: '#D4A574' }
      : { label: '✅ Performance alignée avec edge réel', color: '#4ADE80' };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 className="serif" style={{ margin: '0 0 12px 0', fontSize: 18 }}>Projection long-terme</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1F1F22' }}>
        <span style={{ fontSize: 12, color: '#71717A' }}>ROI actuel</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: data.actualROI >= 0 ? '#4ADE80' : '#F87171' }}>
          {data.actualROI >= 0 ? '+' : ''}{data.actualROI.toFixed(1)}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1F1F22' }}>
        <span style={{ fontSize: 12, color: '#71717A' }}>ROI projeté (CLV)</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: data.projectedROI >= 0 ? '#4ADE80' : '#F87171' }}>
          {data.projectedROI >= 0 ? '+' : ''}{data.projectedROI.toFixed(1)}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
        <span style={{ fontSize: 12, color: '#71717A' }}>Variance (actuel − projeté)</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: Math.abs(data.gap) <= 5 ? '#4ADE80' : '#D4A574' }}>
          {data.gap >= 0 ? '+' : ''}{data.gap.toFixed(1)}%
        </span>
      </div>
      <div style={{ fontSize: 11, color: verdict.color, fontWeight: 700, marginTop: 8 }}>
        {verdict.label}
      </div>
    </div>
  );
}

function StakeSizeCard({ bets, unitSize }) {
  const rows = useMemo(() => stakeBucketStats(bets, unitSize), [bets, unitSize]);
  if (!rows || rows.length === 0) return null;
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 className="serif" style={{ margin: '0 0 4px 0', fontSize: 18 }}>Performance par taille de mise</h3>
      <p style={{ fontSize: 11, color: '#71717A', margin: '0 0 12px 0' }}>
        Détecte le tilt sur grosses mises : si le bucket 2.5u+ est rouge, tu perds sur tes "lock plays".
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => (
          <div key={r.label} style={{ padding: '8px 10px', background: '#0A0A0B', border: '1px solid #1F1F22', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: r.s.profit >= 0 ? '#4ADE80' : '#F87171' }}>
                {r.s.profit >= 0 ? '+' : ''}{r.s.profit.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: '#A1A1AA' }}>
              <span>{r.s.count} bets</span>
              <span>· {r.s.wins}W-{r.s.losses}L</span>
              <span>· ROI <span className="mono" style={{ color: r.s.roi >= 0 ? '#4ADE80' : '#F87171', fontWeight: 600 }}>{r.s.roi >= 0 ? '+' : ''}{r.s.roi.toFixed(1)}%</span></span>
              {r.s.clv != null && <span>· CLV <span className="mono" style={{ color: r.s.clv >= 0 ? '#4ADE80' : '#F87171', fontWeight: 600 }}>{r.s.clv >= 0 ? '+' : ''}{r.s.clv.toFixed(1)}%</span></span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChasingCard({ bets, currency }) {
  const c = useMemo(() => chasingStats(bets), [bets]);
  if (!c) return null;
  const stakeBump = c.afterWin.stake > 0 ? ((c.afterLoss.stake - c.afterWin.stake) / c.afterWin.stake) * 100 : 0;
  const isChasing = stakeBump > 15;
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 className="serif" style={{ margin: '0 0 4px 0', fontSize: 18 }}>Comportement post-résultat</h3>
      <p style={{ fontSize: 11, color: '#71717A', margin: '0 0 12px 0' }}>
        Détecte le chasing : augmenter ses mises après une perte est statistiquement -EV.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ padding: 10, background: '#0A0A0B', border: '1px solid #1F1F22', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Après WIN</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{c.afterWin.stake.toFixed(2)} {currency}</div>
          <div style={{ fontSize: 11, color: c.afterWin.s.roi >= 0 ? '#4ADE80' : '#F87171', marginTop: 4 }}>
            ROI {c.afterWin.s.roi >= 0 ? '+' : ''}{c.afterWin.s.roi.toFixed(1)}% ({c.afterWin.s.count})
          </div>
        </div>
        <div style={{ padding: 10, background: '#0A0A0B', border: `1px solid ${isChasing ? '#F87171' : '#1F1F22'}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Après LOSS</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: isChasing ? '#F87171' : '#FAFAF9' }}>
            {c.afterLoss.stake.toFixed(2)} {currency}
            {stakeBump !== 0 && <span style={{ fontSize: 10, marginLeft: 4 }}>({stakeBump >= 0 ? '+' : ''}{stakeBump.toFixed(0)}%)</span>}
          </div>
          <div style={{ fontSize: 11, color: c.afterLoss.s.roi >= 0 ? '#4ADE80' : '#F87171', marginTop: 4 }}>
            ROI {c.afterLoss.s.roi >= 0 ? '+' : ''}{c.afterLoss.s.roi.toFixed(1)}% ({c.afterLoss.s.count})
          </div>
        </div>
      </div>
      {isChasing && (
        <div style={{ fontSize: 11, color: '#F87171', fontWeight: 700, marginTop: 10, padding: 8, background: '#2A1A1A', borderRadius: 6 }}>
          ⚠️ CHASING DÉTECTÉ — mise augmentée de {stakeBump.toFixed(0)}% après perte
        </div>
      )}
    </div>
  );
}

function ProjectionCard({ bets, currentBankroll, currency }) {
  const horizons = useMemo(() => projectionStats(bets, currentBankroll), [bets, currentBankroll]);
  if (!horizons) return null;
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 className="serif" style={{ margin: '0 0 4px 0', fontSize: 18 }}>Projection bankroll</h3>
      <p style={{ fontSize: 11, color: '#71717A', margin: '0 0 12px 0' }}>
        À ton rythme actuel, projeté avec ton ROI réel et ton ROI projeté CLV (long-terme attendu) ± variance 95%.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {horizons.map(h => (
          <div key={h.days} style={{ padding: 10, background: '#0A0A0B', border: '1px solid #1F1F22', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>+{h.days} jours</span>
              <span style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.1em' }}>{h.futureStake.toFixed(0)} {currency} misés</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
              <span style={{ color: '#71717A' }}>Si rythme actuel</span>
              <span className="mono" style={{ fontWeight: 600, color: h.bankrollActual >= currentBankroll ? '#4ADE80' : '#F87171' }}>
                {h.bankrollActual.toFixed(0)} {currency}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
              <span style={{ color: '#71717A' }}>Projeté CLV (réaliste)</span>
              <span className="mono" style={{ fontWeight: 600, color: h.bankrollProjected >= currentBankroll ? '#4ADE80' : '#F87171' }}>
                {h.bankrollProjected.toFixed(0)} {currency}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', color: '#52525B' }}>
              <span>Range 95%</span>
              <span className="mono">
                [{h.bankrollLow.toFixed(0)} → {h.bankrollHigh.toFixed(0)}]
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsView({ bets, currency, currentBankroll, unitSize, onBack }) {
  const [period, setPeriod] = useState('all');

  const filtered = useMemo(() => {
    if (period === 'all') return bets;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[period];
    if (!days) return bets;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return bets.filter(b => parseLocalDate(b.date) >= cutoff);
  }, [bets, period]);

  const sportRows = useMemo(() => {
    const groups = {};
    filtered.forEach(b => {
      if (b.status === 'pending') return;
      const k = b.sport || 'Autre';
      (groups[k] = groups[k] || []).push(b);
    });
    return Object.entries(groups)
      .map(([k, arr]) => ({ label: k, s: rowStats(arr) }))
      .sort((a, b) => b.s.profit - a.s.profit);
  }, [filtered]);

  const marketRows = useMemo(() => {
    const groups = {};
    filtered.forEach(b => {
      if (b.status === 'pending') return;
      if (!b.marketType) return;
      (groups[b.marketType] = groups[b.marketType] || []).push(b);
    });
    return Object.entries(groups)
      .map(([k, arr]) => ({ label: MARKET_LABEL[k] || k, s: rowStats(arr) }))
      .sort((a, b) => b.s.profit - a.s.profit);
  }, [filtered]);

  const signalRows = useMemo(() => {
    const groups = {};
    filtered.forEach(b => {
      if (b.status === 'pending') return;
      (b.signals || []).forEach(sig => {
        (groups[sig] = groups[sig] || []).push(b);
      });
    });
    return Object.entries(groups)
      .map(([k, arr]) => ({ label: SIGNAL_LABEL[k] || k, s: rowStats(arr) }))
      .sort((a, b) => b.s.profit - a.s.profit);
  }, [filtered]);

  const comboRows = useMemo(() => {
    const groups = {};
    filtered.forEach(b => {
      if (b.status === 'pending') return;
      const sigs = (b.signals || []).slice().sort();
      if (sigs.length < 2) return;
      const key = sigs.join(' + ');
      (groups[key] = groups[key] || []).push(b);
    });
    return Object.entries(groups)
      .map(([k, arr]) => ({ label: k, s: rowStats(arr) }))
      .filter(r => r.s.count >= 3)
      .sort((a, b) => b.s.profit - a.s.profit);
  }, [filtered]);

  const gradeRows = useMemo(() => {
    const groups = {};
    filtered.forEach(b => {
      if (b.status === 'pending') return;
      if (!b.grade) return;
      (groups[b.grade] = groups[b.grade] || []).push(b);
    });
    return Object.entries(groups)
      .map(([k, arr]) => ({ label: k, s: rowStats(arr), _rank: gradeRank(k) }))
      .sort((a, b) => a._rank - b._rank);
  }, [filtered]);

  const juiceRows = useMemo(() => {
    const groups = {};
    filtered.forEach(b => {
      if (b.status === 'pending') return;
      const j = juiceCategory(b.odds);
      if (!j) return;
      (groups[j.k] = groups[j.k] || { label: j.l, bets: [] }).bets.push(b);
    });
    const order = ['plus_money', 'standard', 'premium', 'heavy'];
    return order
      .filter(k => groups[k])
      .map(k => ({ label: groups[k].label, s: rowStats(groups[k].bets) }));
  }, [filtered]);

  const hourRows = useMemo(() => {
    const buckets = {
      morning: { label: 'Matin (avant 12h)', bets: [] },
      afternoon: { label: 'Après-midi (12h-17h)', bets: [] },
      evening: { label: 'Soir (17h+)', bets: [] },
    };
    filtered.forEach(b => {
      if (b.status === 'pending' || !b.createdAt) return;
      const h = new Date(b.createdAt).getHours();
      if (h < 12) buckets.morning.bets.push(b);
      else if (h < 17) buckets.afternoon.bets.push(b);
      else buckets.evening.bets.push(b);
    });
    return Object.values(buckets)
      .filter(b => b.bets.length > 0)
      .map(b => ({ label: b.label, s: rowStats(b.bets) }));
  }, [filtered]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #2A2A2F', color: '#A1A1AA', width: 36, height: 36, borderRadius: 8, cursor: 'pointer' }}>←</button>
        )}
        <h2 className="serif" style={{ margin: 0, fontSize: 28 }}>Analytics</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, padding: 4, background: '#141416', border: '1px solid #222226', borderRadius: 10 }}>
        {[{ k: '7d', l: '7j' }, { k: '30d', l: '30j' }, { k: '90d', l: '90j' }, { k: 'all', l: 'Tout' }].map(o => (
          <button key={o.k} onClick={() => setPeriod(o.k)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: 12,
            background: period === o.k ? '#D4A574' : 'transparent',
            color: period === o.k ? '#0A0A0B' : '#A1A1AA',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
          }}>{o.l}</button>
        ))}
      </div>

      <h3 className="serif" style={{ fontSize: 16, color: '#D4A574', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '.1em' }}>Anti-tilt &amp; projection</h3>
      <ROIConfidenceCard bets={filtered} />
      <CLVProjectionCard bets={filtered} />
      <ProjectionCard bets={filtered} currentBankroll={currentBankroll} currency={currency} />
      <StakeSizeCard bets={filtered} unitSize={unitSize} />
      <ChasingCard bets={filtered} currency={currency} />

      <h3 className="serif" style={{ fontSize: 16, color: '#D4A574', margin: '20px 0 8px 0', textTransform: 'uppercase', letterSpacing: '.1em' }}>Breakdowns</h3>
      <BreakdownSection title="Par sport" rows={sportRows} currency={currency} />
      <BreakdownSection title="Par note (calibration)" rows={gradeRows} currency={currency} />
      <BreakdownSection title="Par type de marché" rows={marketRows} currency={currency} />
      <BreakdownSection title="Par signal (isolé)" rows={signalRows} currency={currency} />
      <BreakdownSection title="Combinaisons (2+ signaux)" rows={comboRows} currency={currency} />
      <BreakdownSection title="Par catégorie de cote" rows={juiceRows} currency={currency} />
      <BreakdownSection title="Par heure de placement" rows={hourRows} currency={currency} />

      {filtered.filter(b => b.status !== 'pending').length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#71717A' }}>
          <p style={{ margin: 0, fontSize: 13 }}>Aucun pari réglé sur cette période.</p>
        </div>
      )}
    </div>
  );
}
