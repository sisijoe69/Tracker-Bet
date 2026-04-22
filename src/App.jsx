import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Target, Settings as SettingsIcon, List, Home, AlertCircle } from 'lucide-react';
import {
  STORAGE_KEY, DEFAULT_DATA, SPORT_LEAGUES, BET_TYPES,
  fetchESPNGames, calcParlayOdds, calcProfit, oddsToImplied, formatOdds, loadInitialData,
} from './utils.js';
import { StatCard, HistoryView, SettingsView, renderGames } from './components.jsx';

export default function App() {
  const [data, setData] = useState(loadInitialData);
  const [view, setView] = useState('dashboard');
  const [showAddBet, setShowAddBet] = useState(false);
  const [editingBet, setEditingBet] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [data]);

  const stats = useMemo(() => {
    const { bets, settings } = data;
    const unitSize = (settings.initialBankroll * settings.unitSizePercent) / 100;
    const settled = bets.filter(b => b.status === 'won' || b.status === 'lost');
    const wins = bets.filter(b => b.status === 'won').length;
    const losses = bets.filter(b => b.status === 'lost').length;
    const pushes = bets.filter(b => b.status === 'push' || b.status === 'void').length;
    const pending = bets.filter(b => b.status === 'pending').length;
    const totalStaked = settled.reduce((s, b) => s + Number(b.stake || 0), 0);
    const totalProfit = bets.reduce((s, b) => s + calcProfit(b.stake, b.odds, b.status), 0);
    const bankroll = settings.initialBankroll + totalProfit;
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    const unitsUp = unitSize > 0 ? totalProfit / unitSize : 0;
    return { bankroll, totalProfit, roi, winRate, wins, losses, pushes, pending, totalStaked, unitSize, unitsUp };
  }, [data]);

  const chartData = useMemo(() => {
    const sorted = [...data.bets]
      .filter(b => b.status !== 'pending')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = data.settings.initialBankroll;
    const points = [{ date: 'Départ', bankroll: running, idx: 0 }];
    sorted.forEach((b, i) => {
      running += calcProfit(b.stake, b.odds, b.status);
      points.push({
        date: new Date(b.date).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }),
        bankroll: Math.round(running * 100) / 100,
        idx: i + 1,
      });
    });
    return points;
  }, [data]);

  const sportStats = useMemo(() => {
    const groups = {};
    data.bets.forEach(b => {
      if (b.status === 'pending') return;
      if (!groups[b.sport]) groups[b.sport] = { sport: b.sport, profit: 0, count: 0, wins: 0, losses: 0 };
      groups[b.sport].profit += calcProfit(b.stake, b.odds, b.status);
      groups[b.sport].count++;
      if (b.status === 'won') groups[b.sport].wins++;
      if (b.status === 'lost') groups[b.sport].losses++;
    });
    return Object.values(groups).sort((a, b) => b.profit - a.profit);
  }, [data]);

  const addBet = (bet) => {
    if (editingBet) {
      setData(prev => ({
        ...prev,
        bets: prev.bets.map(b => b.id === editingBet.id ? { ...bet, id: editingBet.id } : b),
      }));
      setEditingBet(null);
    } else {
      const newBet = { ...bet, id: Date.now().toString() };
      setData(prev => ({ ...prev, bets: [newBet, ...prev.bets] }));
    }
    setShowAddBet(false);
  };

  const updateBetStatus = (id, status) => {
    setData(prev => ({
      ...prev,
      bets: prev.bets.map(b => b.id === id ? { ...b, status } : b),
    }));
  };

  const deleteBet = (id) => {
    setData(prev => ({ ...prev, bets: prev.bets.filter(b => b.id !== id) }));
  };

  const updateSettings = (settings) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  };

  const resetAll = () => {
    if (confirm('Effacer TOUTES les données? Cette action est irréversible.')) {
      setData(DEFAULT_DATA);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
          if (confirm('Remplacer les données actuelles par le fichier importé?')) {
            setData(imported);
            alert('Données importées avec succès.');
          }
        } else {
          alert('Fichier invalide.');
        }
      } catch (err) {
        alert('Erreur de lecture du fichier.');
      }
    };
    reader.readAsText(file);
  };

  const c = data.settings.currency;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#FAFAF9', paddingBottom: 100 }}>
      <div style={{ padding: '32px 20px 16px', borderBottom: '1px solid #1A1A1E' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 10, color: '#71717A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
              Bankroll Actuel
            </div>
            <div className="serif" style={{ fontSize: 42, lineHeight: 1, color: '#FAFAF9' }}>
              {stats.bankroll.toFixed(2)} <span style={{ fontSize: 18, color: '#71717A' }}>{c}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{
              fontSize: 16, fontWeight: 600,
              color: stats.totalProfit >= 0 ? '#4ADE80' : '#F87171',
            }}>
              {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
            </div>
            <div style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>
              {stats.unitsUp >= 0 ? '+' : ''}{stats.unitsUp.toFixed(2)} unités
            </div>
          </div>
        </div>
      </div>

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
  );
}

function AddBetModal({ onAdd, onClose, unitSize, currency, editingBet }) {
  const [form, setForm] = useState(() => {
    if (editingBet) {
      return {
        date: editingBet.date,
        sport: editingBet.sport,
        match: editingBet.match || '',
        description: editingBet.description || '',
        betType: editingBet.betType || 'Moneyline',
        odds: String(editingBet.odds || ''),
        stake: String(editingBet.stake || unitSize.toFixed(2)),
        status: editingBet.status || 'pending',
        notes: editingBet.notes || '',
        legs: editingBet.legs || [],
      };
    }
    return {
      date: new Date().toISOString().split('T')[0],
      sport: 'MLB',
      match: '',
      description: '',
      betType: 'Moneyline',
      odds: '',
      stake: unitSize.toFixed(2),
      status: 'pending',
      notes: '',
      legs: [],
    };
  });

  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gamesError, setGamesError] = useState(null);
  const [showGamesList, setShowGamesList] = useState(false);

  const isParlay = form.betType === 'Parlay';
  const parlayOdds = isParlay ? calcParlayOdds(form.legs) : 0;
  const effectiveOdds = isParlay ? parlayOdds : form.odds;
  const pot = calcProfit(form.stake, effectiveOdds, 'won');
  const imp = oddsToImplied(effectiveOdds);

  const addLeg = () => {
    setForm(f => ({
      ...f,
      legs: [...f.legs, { sport: 'MLB', match: '', description: '', odds: '' }],
    }));
  };

  const updateLeg = (i, field, val) => {
    setForm(f => {
      const legs = [...f.legs];
      legs[i] = { ...legs[i], [field]: val };
      return { ...f, legs };
    });
  };

  const removeLeg = (i) => {
    setForm(f => ({ ...f, legs: f.legs.filter((_, idx) => idx !== i) }));
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
      if (form.legs.length < 2) { alert('Un parlay nécessite au moins 2 jambes.'); return; }
      if (form.legs.some(l => !l.odds || !l.description)) { alert('Remplis toutes les jambes.'); return; }
      if (!form.stake) { alert('Entre une mise.'); return; }
      const autoDesc = form.legs.map(l => l.description).join(' + ');
      onAdd({
        ...form,
        sport: 'Parlay',
        match: `Parlay ${form.legs.length} jambes`,
        description: autoDesc,
        odds: Number(parlayOdds),
        stake: Number(form.stake),
        legs: form.legs,
      });
    } else {
      if (!form.description || !form.odds || !form.stake) { alert('Remplis les champs requis.'); return; }
      onAdd({ ...form, stake: Number(form.stake), odds: Number(form.odds), legs: [] });
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: '#141416', borderTop: '1px solid #2A2A2F', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px 20px 0 0', padding: 24, paddingBottom: 'max(24px,env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="serif" style={{ fontSize: 28 }}>{editingBet ? '✏️ Modifier' : isParlay ? '🎯 Parlay' : 'Nouveau Pari'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div>
              <label className="label">Type de pari</label>
              <select className="input" value={form.betType} onChange={e => setForm({ ...form, betType: e.target.value, legs: e.target.value === 'Parlay' ? (form.legs.length < 2 ? [{ sport: 'MLB', match: '', description: '', odds: '' }, { sport: 'MLB', match: '', description: '', odds: '' }] : form.legs) : form.legs })}>
                {BET_TYPES.map(t => <option key={t} value={t}>{t === 'Parlay' ? '🎯 Parlay' : t}</option>)}
              </select>
            </div>
          </div>

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
                        <select className="input" value={leg.sport} onChange={e => updateLeg(i, 'sport', e.target.value)} style={{ fontSize: 12 }}>
                          {SPORT_LEAGUES.map(s => <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Cote (US) *</label>
                        <input className="input mono" type="number" placeholder="-127" value={leg.odds} onChange={e => updateLeg(i, 'odds', e.target.value)} style={{ fontSize: 12 }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label className="label">Match</label>
                      <input className="input" placeholder="ex: Cubs vs Phillies" value={leg.match} onChange={e => updateLeg(i, 'match', e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                    <div>
                      <label className="label">Sélection *</label>
                      <input className="input" placeholder="ex: Cubs ML, Under 7" value={leg.description} onChange={e => updateLeg(i, 'description', e.target.value)} style={{ fontSize: 12 }} />
                    </div>
                  </div>
                ))}
              </div>

              {form.legs.length >= 2 && form.legs.every(l => l.odds) && (
                <div className="card-elevated" style={{ padding: 14, marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: '#71717A' }}>Cote parlay estimée</span>
                    <span className="mono" style={{ color: '#D4A574', fontWeight: 700, fontSize: 16 }}>{formatOdds(parlayOdds)}</span>
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
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Sport</label>
                  <select className="input" value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })}>
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
                <input className="input" placeholder="ex: NYY @ BOS" value={form.match} onChange={e => setForm({ ...form, match: e.target.value })} />
                {showGamesList && renderGames(games, gamesError, form, setForm, setShowGamesList)}
              </div>

              <div><label className="label">Description *</label><input className="input" placeholder="ex: Red Sox ML, Under 8.5" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Cote (US) *</label><input className="input mono" type="number" placeholder="-110 ou +150" value={form.odds} onChange={e => setForm({ ...form, odds: e.target.value })} /></div>
                <div><label className="label">Mise ({currency}) *</label><input className="input mono" type="number" step="0.01" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} /></div>
              </div>

              {form.odds && form.stake && (
                <div className="card-elevated" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ color: '#71717A' }}>Gain potentiel</span><span className="mono" style={{ color: '#4ADE80', fontWeight: 700 }}>+{pot.toFixed(2)} {currency}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ color: '#71717A' }}>Prob. implicite</span><span className="mono" style={{ color: '#A1A1AA' }}>{(imp * 100).toFixed(1)}%</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#71717A' }}>En unités</span><span className="mono" style={{ color: '#A1A1AA' }}>{(Number(form.stake) / unitSize).toFixed(2)}u</span></div>
                </div>
              )}
            </>
          )}

          {isParlay && (
            <div>
              <label className="label">Mise ({currency}) *</label>
              <input className="input mono" type="number" step="0.01" placeholder="20.00" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} />
            </div>
          )}

          <div><label className="label">Notes</label><textarea className="input" rows={2} placeholder="Raisonnement, contexte..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} /></div>

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
  );
}
