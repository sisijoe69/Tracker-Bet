import React, { useState, useEffect, useMemo } from ‘react’;
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from ‘recharts’;
import { Plus, Target, Trash2, Check, X, Minus, Settings as SettingsIcon, List, Home, Download, AlertCircle } from ‘lucide-react’;

const STORAGE_KEY = ‘bet-tracker-v1’;

const DEFAULT_DATA = {
settings: {
initialBankroll: 1000,
unitSizePercent: 1,
currency: ‘CAD’,
},
bets: [],
};

const SPORT_LEAGUES = [
{ label: ‘MLB’, path: ‘baseball/mlb’, emoji: ‘⚾’ },
{ label: ‘NHL’, path: ‘hockey/nhl’, emoji: ‘🏒’ },
{ label: ‘NBA’, path: ‘basketball/nba’, emoji: ‘🏀’ },
{ label: ‘WNBA’, path: ‘basketball/wnba’, emoji: ‘🏀’ },
{ label: ‘NFL’, path: ‘football/nfl’, emoji: ‘🏈’ },
{ label: ‘NCAAF’, path: ‘football/college-football’, emoji: ‘🏈’ },
{ label: ‘NCAAB’, path: ‘basketball/mens-college-basketball’, emoji: ‘🏀’ },
{ label: ‘EPL’, path: ‘soccer/eng.1’, emoji: ‘⚽’ },
{ label: ‘La Liga’, path: ‘soccer/esp.1’, emoji: ‘⚽’ },
{ label: ‘Serie A’, path: ‘soccer/ita.1’, emoji: ‘⚽’ },
{ label: ‘Bundesliga’, path: ‘soccer/ger.1’, emoji: ‘⚽’ },
{ label: ‘Ligue 1’, path: ‘soccer/fra.1’, emoji: ‘⚽’ },
{ label: ‘MLS’, path: ‘soccer/usa.1’, emoji: ‘⚽’ },
{ label: ‘UCL’, path: ‘soccer/uefa.champions’, emoji: ‘⚽’ },
{ label: ‘Europa’, path: ‘soccer/uefa.europa’, emoji: ‘⚽’ },
{ label: ‘UFC’, path: ‘mma/ufc’, emoji: ‘🥊’ },
{ label: ‘ATP’, path: ‘tennis/atp’, emoji: ‘🎾’ },
{ label: ‘WTA’, path: ‘tennis/wta’, emoji: ‘🎾’ },
{ label: ‘PGA’, path: ‘golf/pga’, emoji: ‘⛳’ },
{ label: ‘F1’, path: ‘racing/f1’, emoji: ‘🏎️’ },
{ label: ‘Autre’, path: null, emoji: ‘🎯’ },
];

const BET_TYPES = [‘Moneyline’, ‘Spread/Run Line’, ‘Over/Under’, ‘Prop’, ‘Parlay’, ‘Futures’, ‘Autre’];

// Fetch games directly from ESPN (CORS works on deployed domain)
async function fetchESPNGames(sportLabel, dateStr) {
const league = SPORT_LEAGUES.find(s => s.label === sportLabel);
if (!league || !league.path) return { games: [], error: null };
const dateParam = (dateStr || ‘’).replace(/-/g, ‘’);
const url = `https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard${dateParam ? `?dates=${dateParam}` : ''}`;
try {
const r = await fetch(url);
if (!r.ok) throw new Error(`HTTP ${r.status}`);
const json = await r.json();
const events = json.events || [];
const games = events.map(e => {
const comp = e.competitions?.[0] || {};
const teams = comp.competitors || [];
const home = teams.find(t => t.homeAway === ‘home’) || teams[0];
const away = teams.find(t => t.homeAway === ‘away’) || teams[1];
const state = e.status?.type?.state || ‘pre’;
const statusDetail = e.status?.type?.shortDetail || ‘’;
const d = new Date(e.date);
const localTime = d.toLocaleTimeString(‘fr-CA’, { hour: ‘2-digit’, minute: ‘2-digit’, hour12: false });
const awayName = away?.team?.displayName || away?.athlete?.displayName || away?.team?.name || ‘TBD’;
const homeName = home?.team?.displayName || home?.athlete?.displayName || home?.team?.name || ‘TBD’;
return {
id: e.id,
name: e.shortName || `${awayName} @ ${homeName}`,
fullName: e.name || `${awayName} @ ${homeName}`,
awayName, homeName,
date: e.date,
localTime,
state,
statusDetail,
};
});
return { games, error: null };
} catch (err) {
return { games: [], error: err.message || ‘Erreur réseau’ };
}
}

// Calculate combined parlay odds from legs (American odds)
function calcParlayOdds(legs) {
if (!legs || legs.length < 2) return 0;
const decimal = legs.reduce((acc, leg) => {
const o = Number(leg.odds);
if (!o) return acc;
const d = o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
return acc * d;
}, 1);
if (decimal >= 2) return Math.round((decimal - 1) * 100);
return Math.round(-100 / (decimal - 1));
}

const calcProfit = (stake, odds, status) => {
const s = Number(stake) || 0;
const o = Number(odds) || 0;
if (status === ‘pending’) return 0;
if (status === ‘push’ || status === ‘void’) return 0;
if (status === ‘lost’) return -s;
if (status === ‘won’) {
return o > 0 ? s * (o / 100) : s * (100 / Math.abs(o));
}
return 0;
};

const oddsToImplied = (odds) => {
const o = Number(odds);
if (!o) return 0;
return o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100);
};

const formatOdds = (o) => {
const n = Number(o);
if (!n) return ‘—’;
return n > 0 ? `+${n}` : `${n}`;
};

// Load initial data synchronously from localStorage
function loadInitialData() {
try {
const raw = localStorage.getItem(STORAGE_KEY);
if (raw) return JSON.parse(raw);
} catch (e) {}
return DEFAULT_DATA;
}

export default function App() {
const [data, setData] = useState(loadInitialData);
const [view, setView] = useState(‘dashboard’);
const [showAddBet, setShowAddBet] = useState(false);

// Persist on change
useEffect(() => {
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
} catch (e) {
console.error(‘Storage error:’, e);
}
}, [data]);

const stats = useMemo(() => {
const { bets, settings } = data;
const unitSize = (settings.initialBankroll * settings.unitSizePercent) / 100;
const settled = bets.filter(b => b.status === ‘won’ || b.status === ‘lost’);
const wins = bets.filter(b => b.status === ‘won’).length;
const losses = bets.filter(b => b.status === ‘lost’).length;
const pushes = bets.filter(b => b.status === ‘push’ || b.status === ‘void’).length;
const pending = bets.filter(b => b.status === ‘pending’).length;
const totalStaked = settled.reduce((s, b) => s + Number(b.stake || 0), 0);
const totalProfit = bets.reduce((s, b) => s + calcProfit(b.stake, b.odds, b.status), 0);
const bankroll = settings.initialBankroll + totalProfit;
const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
const unitsUp = unitSize > 0 ? totalProfit / unitSize : 0;
return { bankroll, totalProfit, roi, winRate, wins, losses, pushes, pending, totalStaked, unitSize, unitsUp };
}, [data]);

const chartData = useMemo(() => {
const sorted = […data.bets]
.filter(b => b.status !== ‘pending’)
.sort((a, b) => new Date(a.date) - new Date(b.date));
let running = data.settings.initialBankroll;
const points = [{ date: ‘Départ’, bankroll: running, idx: 0 }];
sorted.forEach((b, i) => {
running += calcProfit(b.stake, b.odds, b.status);
points.push({
date: new Date(b.date).toLocaleDateString(‘fr-CA’, { month: ‘short’, day: ‘numeric’ }),
bankroll: Math.round(running * 100) / 100,
idx: i + 1,
});
});
return points;
}, [data]);

const sportStats = useMemo(() => {
const groups = {};
data.bets.forEach(b => {
if (b.status === ‘pending’) return;
if (!groups[b.sport]) groups[b.sport] = { sport: b.sport, profit: 0, count: 0, wins: 0, losses: 0 };
groups[b.sport].profit += calcProfit(b.stake, b.odds, b.status);
groups[b.sport].count++;
if (b.status === ‘won’) groups[b.sport].wins++;
if (b.status === ‘lost’) groups[b.sport].losses++;
});
return Object.values(groups).sort((a, b) => b.profit - a.profit);
}, [data]);

// Save immediately to localStorage on every change
const saveAndSet = (updater) => {
setData(prev => {
const next = updater(prev);
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
} catch (e) {
console.error(‘Save error:’, e);
}
return next;
});
};

const [editingBet, setEditingBet] = useState(null);

const addBet = (bet) => {
if (editingBet) {
// Update existing bet
saveAndSet(prev => ({
…prev,
bets: prev.bets.map(b => b.id === editingBet.id ? { …bet, id: editingBet.id } : b),
}));
setEditingBet(null);
} else {
const newBet = { …bet, id: Date.now().toString() };
saveAndSet(prev => ({ …prev, bets: [newBet, …prev.bets] }));
}
setShowAddBet(false);
};

const updateBetStatus = (id, status) => {
saveAndSet(prev => ({
…prev,
bets: prev.bets.map(b => b.id === id ? { …b, status } : b),
}));
};

const deleteBet = (id) => {
saveAndSet(prev => ({ …prev, bets: prev.bets.filter(b => b.id !== id) }));
};

const updateSettings = (settings) => {
saveAndSet(prev => ({ …prev, settings: { …prev.settings, …settings } }));
};

const resetAll = () => {
if (confirm(‘Effacer TOUTES les données? Cette action est irréversible.’)) {
setData(DEFAULT_DATA);
}
};

const exportData = () => {
const blob = new Blob([JSON.stringify(data, null, 2)], { type: ‘application/json’ });
const url = URL.createObjectURL(blob);
const a = document.createElement(‘a’);
a.href = url;
a.download = `bet-tracker-${new Date().toISOString().split('T')[0]}.json`;
a.click();
};

const importData = (e) => {
const file = e.target.files?.[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (event) => {
try {
const imported = JSON.parse(event.target.result);
if (imported.settings && Array.isArray(imported.bets)) {
if (confirm(‘Remplacer les données actuelles par le fichier importé?’)) {
setData(imported);
alert(‘Données importées avec succès.’);
}
} else {
alert(‘Fichier invalide.’);
}
} catch (err) {
alert(‘Erreur de lecture du fichier.’);
}
};
reader.readAsText(file);
};

const c = data.settings.currency;

return (
<div style={{ minHeight: ‘100vh’, background: ‘#0A0A0B’, color: ‘#FAFAF9’, paddingBottom: 100 }}>
{/* Header */}
<div style={{ padding: ‘32px 20px 16px’, borderBottom: ‘1px solid #1A1A1E’ }}>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘baseline’, marginBottom: 4 }}>
<div>
<div style={{ fontSize: 10, color: ‘#71717A’, letterSpacing: ‘0.2em’, textTransform: ‘uppercase’, marginBottom: 4 }}>
Bankroll Actuel
</div>
<div className=“serif” style={{ fontSize: 42, lineHeight: 1, color: ‘#FAFAF9’ }}>
{stats.bankroll.toFixed(2)} <span style={{ fontSize: 18, color: ‘#71717A’ }}>{c}</span>
</div>
</div>
<div style={{ textAlign: ‘right’ }}>
<div className=“mono” style={{
fontSize: 16, fontWeight: 600,
color: stats.totalProfit >= 0 ? ‘#4ADE80’ : ‘#F87171’,
}}>
{stats.totalProfit >= 0 ? ‘+’ : ‘’}{stats.totalProfit.toFixed(2)}
</div>
<div style={{ fontSize: 11, color: ‘#71717A’, marginTop: 2 }}>
{stats.unitsUp >= 0 ? ‘+’ : ‘’}{stats.unitsUp.toFixed(2)} unités
</div>
</div>
</div>
</div>

```
  <div style={{ padding: '20px', maxWidth: 700, margin: '0 auto' }}>
    {view === 'dashboard' && (
      <div className="fade-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="ROI" value={`${stats.roi.toFixed(2)}%`} accent={stats.roi >= 0 ? 'green' : 'red'} />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} accent={stats.winRate >= 52.4 ? 'green' : 'neutral'} />
          <StatCard label="Record" value={`${stats.wins}-${stats.losses}${stats.pushes ? `-${stats.pushes}` : ''}`} accent="neutral" />
          <StatCard label="En Attente" value={stats.pending} accent="gold" />
        </div>

        {chartData.length > 1 && (
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 22 }}>Évolution</h3>
              <span style={{ fontSize: 11, color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Bankroll</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F22" vertical={false} />
                <XAxis dataKey="date" stroke="#52525B" style={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525B" style={{ fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: '#141416', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#A1A1AA' }}
                  formatter={(v) => [`${v} ${c}`, 'Bankroll']}
                />
                <Line type="monotone" dataKey="bankroll" stroke="#D4A574" strokeWidth={2} dot={{ fill: '#D4A574', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {sportStats.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 className="serif" style={{ margin: '0 0 16px 0', fontSize: 22 }}>Performance par Sport</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sportStats.map(s => (
                <div key={s.sport} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1F1F22' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.sport}</div>
                    <div style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{s.wins}W - {s.losses}L · {s.count} paris</div>
                  </div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: s.profit >= 0 ? '#4ADE80' : '#F87171' }}>
                    {s.profit >= 0 ? '+' : ''}{s.profit.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 16, marginBottom: 20, borderLeft: '3px solid #D4A574' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <AlertCircle size={16} style={{ color: '#D4A574', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>
              <strong style={{ color: '#FAFAF9' }}>Break-even à -110 :</strong> 52,4% de win rate. Les pros visent 55%+.
              Unité actuelle : <span className="mono" style={{ color: '#D4A574' }}>{stats.unitSize.toFixed(2)} {c}</span>
            </div>
          </div>
        </div>

        {data.bets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717A' }}>
            <Target size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Aucun pari encore enregistré.</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Ajoute ton premier pari pour commencer le tracking.</p>
          </div>
        )}
      </div>
    )}

    {view === 'history' && (
      <HistoryView bets={data.bets} currency={c} onUpdate={updateBetStatus} onDelete={deleteBet} onEdit={(bet) => { setEditingBet(bet); setShowAddBet(true); }} />
    )}

    {view === 'settings' && (
      <SettingsView data={data} onUpdate={updateSettings} onReset={resetAll} onExport={exportData} onImport={importData} />
    )}
  </div>

  <button
    onClick={() => setShowAddBet(true)}
    style={{
      position: 'fixed', bottom: 90, right: 20, zIndex: 50,
      background: '#D4A574', color: '#0A0A0B', border: 'none',
      width: 56, height: 56, borderRadius: '50%', cursor: 'pointer',
      boxShadow: '0 10px 30px rgba(212, 165, 116, 0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <Plus size={24} strokeWidth={2.5} />
  </button>

  <div style={{
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'rgba(10, 10, 11, 0.95)', backdropFilter: 'blur(20px)',
    borderTop: '1px solid #222226', padding: '8px 12px',
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
    display: 'flex', justifyContent: 'space-around', zIndex: 40,
  }}>
    <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
      <Home size={20} />
      <span>Tableau</span>
    </div>
    <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
      <List size={20} />
      <span>Historique</span>
    </div>
    <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
      <SettingsIcon size={20} />
      <span>Réglages</span>
    </div>
  </div>

  {showAddBet && (
    <AddBetModal
      onAdd={addBet}
      onClose={() => { setShowAddBet(false); setEditingBet(null); }}
      unitSize={stats.unitSize}
      currency={c}
      editingBet={editingBet}
    />
  )}
</div>
```

);
}

function StatCard({ label, value, accent }) {
const colors = { green: ‘#4ADE80’, red: ‘#F87171’, gold: ‘#D4A574’, neutral: ‘#FAFAF9’ };
return (
<div className=“card” style={{ padding: 16 }}>
<div style={{ fontSize: 10, color: ‘#71717A’, letterSpacing: ‘0.15em’, textTransform: ‘uppercase’, marginBottom: 8, fontWeight: 500 }}>
{label}
</div>
<div className=“mono” style={{ fontSize: 22, fontWeight: 600, color: colors[accent] }}>
{value}
</div>
</div>
);
}

function HistoryView({ bets, currency, onUpdate, onDelete, onEdit }) {
const [filter, setFilter] = useState(‘all’);
const filtered = bets.filter(b => filter === ‘all’ || b.status === filter);
const statusLabels = { all: ‘Tous’, pending: ‘En attente’, won: ‘Gagnés’, lost: ‘Perdus’, push: ‘Poussée’ };

return (
<div className="fade-in">
<h2 className=“serif” style={{ margin: ‘0 0 16px 0’, fontSize: 28 }}>Historique</h2>
<div style={{ display: ‘flex’, gap: 8, marginBottom: 16, overflowX: ‘auto’, paddingBottom: 4 }}>
{Object.entries(statusLabels).map(([k, v]) => (
<button
key={k} onClick={() => setFilter(k)}
style={{
padding: ‘6px 12px’, borderRadius: 20, fontSize: 12, cursor: ‘pointer’,
background: filter === k ? ‘#D4A574’ : ‘transparent’,
color: filter === k ? ‘#0A0A0B’ : ‘#A1A1AA’,
border: `1px solid ${filter === k ? '#D4A574' : '#2A2A2F'}`,
fontFamily: ‘inherit’, whiteSpace: ‘nowrap’,
}}
>{v}</button>
))}
</div>
{filtered.length === 0 ? (
<div style={{ textAlign: ‘center’, padding: 40, color: ‘#71717A’, fontSize: 13 }}>
Aucun pari dans cette catégorie.
</div>
) : (
<div style={{ display: ‘flex’, flexDirection: ‘column’, gap: 10 }}>
{filtered.map(b => <BetCard key={b.id} bet={b} currency={currency} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} />)}
</div>
)}
</div>
);
}

function BetCard({ bet, currency, onUpdate, onDelete, onEdit }) {
const [expanded, setExpanded] = useState(false);
const profit = calcProfit(bet.stake, bet.odds, bet.status);
const isParlay = bet.betType === ‘Parlay’ || (bet.legs && bet.legs.length > 0);
const statusColors = { pending: ‘#A1A1AA’, won: ‘#4ADE80’, lost: ‘#F87171’, push: ‘#D4A574’, void: ‘#A1A1AA’ };
const statusLabel = { pending: ‘En attente’, won: ‘Gagné’, lost: ‘Perdu’, push: ‘Poussée’, void: ‘Annulé’ };

return (
<div className=“card” style={{ padding: 16 }}>
<div onClick={() => setExpanded(!expanded)} style={{ cursor: ‘pointer’ }}>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘flex-start’, marginBottom: 6 }}>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: 8, marginBottom: 4 }}>
<span style={{ fontSize: 10, background: isParlay ? ‘#2A1F0A’ : ‘#2A2A2F’, color: isParlay ? ‘#D4A574’ : ‘#A1A1AA’, padding: ‘2px 8px’, borderRadius: 4, letterSpacing: ‘0.05em’, textTransform: ‘uppercase’, fontWeight: 700 }}>
{isParlay ? ‘🎯 PARLAY’ : bet.sport}
</span>
<span style={{ fontSize: 11, color: ‘#71717A’ }}>
{new Date(bet.date).toLocaleDateString(‘fr-CA’, { month: ‘short’, day: ‘numeric’ })}
</span>
</div>
<div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{bet.description}</div>
{!isParlay && <div style={{ fontSize: 12, color: ‘#71717A’ }}>{bet.match}</div>}
{isParlay && bet.legs && (
<div style={{ fontSize: 11, color: ‘#71717A’, marginTop: 2 }}>{bet.legs.length} jambes · {bet.legs.map(l => l.sport).join(’ + ’)}</div>
)}
</div>
<div style={{ textAlign: ‘right’, marginLeft: 12 }}>
<div className=“mono” style={{ fontSize: 14, fontWeight: 700, color: statusColors[bet.status] }}>
{bet.status === ‘pending’ ? formatOdds(bet.odds) : (profit >= 0 ? ‘+’ : ‘’) + profit.toFixed(2)}
</div>
<div style={{ fontSize: 10, color: statusColors[bet.status], marginTop: 2, textTransform: ‘uppercase’, letterSpacing: ‘0.1em’, fontWeight: 700 }}>
{statusLabel[bet.status]}
</div>
</div>
</div>
<div className=“mono” style={{ fontSize: 11, color: ‘#71717A’ }}>
{bet.stake} {currency} @ {formatOdds(bet.odds)}
</div>
</div>

```
  {expanded && (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #222226' }}>
      {bet.notes && (
        <div style={{ fontSize: 12, color: '#A1A1AA', marginBottom: 12, fontStyle: 'italic' }}>
          « {bet.notes} »
        </div>
      )}
      {/* Parlay legs display */}
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
```

);
}

function AddBetModal({ onAdd, onClose, unitSize, currency, editingBet }) {
const [form, setForm] = useState(() => {
if (editingBet) {
return {
date: editingBet.date,
sport: editingBet.sport,
match: editingBet.match || ‘’,
description: editingBet.description || ‘’,
betType: editingBet.betType || ‘Moneyline’,
odds: String(editingBet.odds || ‘’),
stake: String(editingBet.stake || unitSize.toFixed(2)),
status: editingBet.status || ‘pending’,
notes: editingBet.notes || ‘’,
legs: editingBet.legs || [],
};
}
return {
date: new Date().toISOString().split(‘T’)[0],
sport: ‘MLB’,
match: ‘’,
description: ‘’,
betType: ‘Moneyline’,
odds: ‘’,
stake: unitSize.toFixed(2),
status: ‘pending’,
notes: ‘’,
legs: [],
};
});

const [games, setGames] = useState([]);
const [loadingGames, setLoadingGames] = useState(false);
const [gamesError, setGamesError] = useState(null);
const [showGamesList, setShowGamesList] = useState(false);

const isParlay = form.betType === ‘Parlay’;
const parlayOdds = isParlay ? calcParlayOdds(form.legs) : 0;
const effectiveOdds = isParlay ? parlayOdds : form.odds;
const pot = calcProfit(form.stake, effectiveOdds, ‘won’);
const imp = implied(effectiveOdds);

const addLeg = () => {
setForm(f => ({
…f,
legs: […f.legs, { sport: ‘MLB’, match: ‘’, description: ‘’, odds: ‘’ }],
}));
};

const updateLeg = (i, field, val) => {
setForm(f => {
const legs = […f.legs];
legs[i] = { …legs[i], [field]: val };
return { …f, legs };
});
};

const removeLeg = (i) => {
setForm(f => ({ …f, legs: f.legs.filter((_, idx) => idx !== i) }));
};

useEffect(() => {
setGames([]); setShowGamesList(false); setGamesError(null);
}, [form.sport, form.date]);

const loadGames = async () => {
setLoadingGames(true); setGamesError(null);
const { games: g, error } = await fetchESPNGames(form.sport, form.date);
setGames(g); setGamesError(error); setShowGamesList(true); setLoadingGames(false);
};

const handleSubmit = () => {
if (isParlay) {
if (form.legs.length < 2) { alert(‘Un parlay nécessite au moins 2 jambes.’); return; }
if (form.legs.some(l => !l.odds || !l.description)) { alert(‘Remplis toutes les jambes.’); return; }
if (!form.stake) { alert(‘Entre une mise.’); return; }
const autoDesc = form.legs.map(l => l.description).join(’ + ’);
onAdd({
…form,
sport: ‘Parlay’,
match: `Parlay ${form.legs.length} jambes`,
description: autoDesc,
odds: Number(parlayOdds),
stake: Number(form.stake),
legs: form.legs,
});
} else {
if (!form.description || !form.odds || !form.stake) { alert(‘Remplis les champs requis.’); return; }
onAdd({ …form, stake: Number(form.stake), odds: Number(form.odds), legs: [] });
}
};

return (
<div onClick={onClose} style={{ position: ‘fixed’, inset: 0, background: ‘rgba(0,0,0,.7)’, backdropFilter: ‘blur(4px)’, zIndex: 100, display: ‘flex’, alignItems: ‘flex-end’, justifyContent: ‘center’ }}>
<div onClick={e => e.stopPropagation()} className=“fade-in” style={{ background: ‘#141416’, borderTop: ‘1px solid #2A2A2F’, width: ‘100%’, maxWidth: 600, maxHeight: ‘92vh’, overflowY: ‘auto’, borderRadius: ‘20px 20px 0 0’, padding: 24, paddingBottom: ‘max(24px,env(safe-area-inset-bottom))’ }}>
<div style={{ display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’, marginBottom: 20 }}>
<h2 className=“serif” style={{ fontSize: 28 }}>{editingBet ? ‘✏️ Modifier’ : isParlay ? ‘🎯 Parlay’ : ‘Nouveau Pari’}</h2>
<button onClick={onClose} style={{ background: ‘transparent’, border: ‘none’, color: ‘#71717A’, cursor: ‘pointer’, fontSize: 20 }}>✕</button>
</div>

```
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Date + Bet Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label className="label">Date</label><input type="date" className="inp" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div>
          <label className="label">Type de pari</label>
          <select className="inp" value={form.betType} onChange={e => setForm({ ...form, betType: e.target.value, legs: e.target.value === 'Parlay' ? (form.legs.length < 2 ? [{ sport: 'MLB', match: '', description: '', odds: '' }, { sport: 'MLB', match: '', description: '', odds: '' }] : form.legs) : form.legs })}>
            {BET_TYPES.map(t => <option key={t} value={t}>{t === 'Parlay' ? '🎯 Parlay' : t}</option>)}
          </select>
        </div>
      </div>

      {/* PARLAY MODE */}
      {isParlay ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="label" style={{ marginBottom: 0 }}>Jambes du parlay ({form.legs.length})</label>
            {form.legs.length < 8 && (
              <button onClick={addLeg} style={{ background: 'transparent', border: 'none', color: '#D4A574', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>
                + Ajouter jambe
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {form.legs.map((leg, i) => (
              <div key={i} style={{ background: '#0A0A0B', border: '1px solid #2A2A2F', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#D4A574', fontWeight: 700 }}>Jambe {i + 1}</span>
                  {form.legs.length > 2 && (
                    <button onClick={() => removeLeg(i)} style={{ background: 'transparent', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label className="label">Sport</label>
                    <select className="inp" value={leg.sport} onChange={e => updateLeg(i, 'sport', e.target.value)} style={{ fontSize: 12 }}>
                      {SPORT_LEAGUES.map(s => <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Cote (US) *</label>
                    <input className="inp mono" type="number" placeholder="-127" value={leg.odds} onChange={e => updateLeg(i, 'odds', e.target.value)} style={{ fontSize: 12 }} />
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label className="label">Match</label>
                  <input className="inp" placeholder="ex: Cubs vs Phillies" value={leg.match} onChange={e => updateLeg(i, 'match', e.target.value)} style={{ fontSize: 12 }} />
                </div>
                <div>
                  <label className="label">Sélection *</label>
                  <input className="inp" placeholder="ex: Cubs ML, Under 7" value={leg.description} onChange={e => updateLeg(i, 'description', e.target.value)} style={{ fontSize: 12 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Parlay combined odds display */}
          {form.legs.length >= 2 && form.legs.every(l => l.odds) && (
            <div className="card-el" style={{ padding: 14, marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#71717A' }}>Cote parlay estimée</span>
                <span className="mono" style={{ color: '#D4A574', fontWeight: 700, fontSize: 16 }}>{fmtOdds(parlayOdds)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#71717A' }}>Gain potentiel</span>
                <span className="mono" style={{ color: '#4ADE80', fontWeight: 700 }}>+{pot.toFixed(2)} {currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#71717A' }}>Prob. implicite</span>
                <span className="mono" style={{ color: '#A1A1AA' }}>{(imp * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SINGLE BET MODE */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">Sport</label>
              <select className="inp" value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })}>
                {SPORT_LEAGUES.map(s => <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              {SPORT_LEAGUES.find(s => s.label === form.sport)?.path && (
                <div style={{ width: '100%' }}>
                  <label className="label">ESPN</label>
                  <button type="button" onClick={loadGames} disabled={loadingGames} style={{ background: '#1C1C1F', border: '1px solid #2A2A2F', color: '#D4A574', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, borderRadius: 8, padding: '10px 12px', width: '100%' }}>
                    {loadingGames ? '⟳ ...' : '📡 Charger'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Match</label>
            <input className="inp" placeholder="ex: NYY @ BOS" value={form.match} onChange={e => setForm({ ...form, match: e.target.value })} />
            {showGames(games, gamesError, form, setForm, setShowGamesList)}
          </div>

          <div><label className="label">Description *</label><input className="inp" placeholder="ex: Red Sox ML, Under 8.5" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">Cote (US) *</label><input className="inp mono" type="number" placeholder="-110 ou +150" value={form.odds} onChange={e => setForm({ ...form, odds: e.target.value })} /></div>
            <div><label className="label">Mise ({currency}) *</label><input className="inp mono" type="number" step="0.01" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} /></div>
          </div>

          {form.odds && form.stake && (
            <div className="card-el" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ color: '#71717A' }}>Gain potentiel</span><span className="mono" style={{ color: '#4ADE80', fontWeight: 700 }}>+{pot.toFixed(2)} {currency}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ color: '#71717A' }}>Prob. implicite</span><span className="mono" style={{ color: '#A1A1AA' }}>{(imp * 100).toFixed(1)}%</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#71717A' }}>En unités</span><span className="mono" style={{ color: '#A1A1AA' }}>{(Number(form.stake) / unitSize).toFixed(2)}u</span></div>
            </div>
          )}
        </>
      )}

      {/* Stake (always shown) */}
      {isParlay && (
        <div>
          <label className="label">Mise ({currency}) *</label>
          <input className="inp mono" type="number" step="0.01" placeholder="20.00" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} />
        </div>
      )}

      <div><label className="label">Notes</label><textarea className="inp" rows={2} placeholder="Raisonnement, contexte..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} /></div>

      <div>
        <label className="label">Statut</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {[{ k: 'pending', l: 'Attente' }, { k: 'won', l: 'Gagné' }, { k: 'lost', l: 'Perdu' }, { k: 'push', l: 'Push' }].map(s => (
            <button key={s.k} onClick={() => setForm({ ...form, status: s.k })} style={{ padding: 8, borderRadius: 6, fontSize: 12, cursor: 'pointer', background: form.status === s.k ? '#D4A574' : 'transparent', color: form.status === s.k ? '#0A0A0B' : '#A1A1AA', border: `1px solid ${form.status === s.k ? '#D4A574' : '#2A2A2F'}`, fontFamily: 'inherit', fontWeight: 600 }}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} className="btn-primary" style={{ marginTop: 8, padding: 14, fontSize: 15 }}>
        {editingBet ? '💾 Sauvegarder' : isParlay ? '🎯 Enregistrer le parlay' : 'Enregistrer le pari'}
      </button>
    </div>
  </div>
</div>
```

);
}

// Helper to render games dropdown
function showGames(games, gamesError, form, setForm, setShowGamesList) {
if (!games.length && !gamesError) return null;
return (
<div style={{ marginTop: 8 }}>
{gamesError && <div style={{ padding: 10, background: ‘#2A1A1A’, border: ‘1px solid #F87171’, borderRadius: 6, fontSize: 11, color: ‘#F87171’ }}>{gamesError}</div>}
{!gamesError && games.length === 0 && <div style={{ padding: 10, background: ‘#141416’, border: ‘1px solid #2A2A2F’, borderRadius: 6, fontSize: 12, color: ‘#71717A’, textAlign: ‘center’ }}>Aucun match trouvé.</div>}
{games.length > 0 && (
<div style={{ maxHeight: 190, overflowY: ‘auto’, border: ‘1px solid #2A2A2F’, borderRadius: 6, background: ‘#0A0A0B’ }}>
{games.map(g => {
const sc = g.state === ‘in’ ? ‘#4ADE80’ : g.state === ‘post’ ? ‘#71717A’ : ‘#A1A1AA’;
const lbl = g.state === ‘in’ ? ‘🔴 LIVE’ : g.state === ‘post’ ? `✓ ${g.statusDetail || 'Fin'}` : g.localTime;
return (
<button key={g.id} onClick={() => { setForm(f => ({ …f, match: g.name })); setShowGamesList(false); }} style={{ width: ‘100%’, padding: ‘10px 12px’, background: ‘transparent’, border: ‘none’, borderBottom: ‘1px solid #1A1A1E’, color: ‘#FAFAF9’, cursor: ‘pointer’, textAlign: ‘left’, display: ‘flex’, justifyContent: ‘space-between’, alignItems: ‘center’, fontFamily: ‘inherit’, fontSize: 13 }}>
<span style={{ fontWeight: 600 }}>{g.name}</span>
<span style={{ fontSize: 10, color: sc, whiteSpace: ‘nowrap’, marginLeft: 8, textTransform: ‘uppercase’ }}>{lbl}</span>
</button>
);
})}
</div>
)}
</div>
);
}

function SettingsView({ data, onUpdate, onReset, onExport, onImport }) {
const [local, setLocal] = useState(data.settings);

const save = () => {
onUpdate({
initialBankroll: Number(local.initialBankroll),
unitSizePercent: Number(local.unitSizePercent),
currency: local.currency,
});
alert(‘Paramètres sauvegardés.’);
};

const unitValue = (local.initialBankroll * local.unitSizePercent) / 100;

return (
<div className="fade-in">
<h2 className=“serif” style={{ margin: ‘0 0 20px 0’, fontSize: 28 }}>Réglages</h2>

```
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
```

);
}
    
