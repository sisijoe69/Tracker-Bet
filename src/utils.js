export const STORAGE_KEY = 'bet-tracker-v1';

export const DEFAULT_DATA = {
  settings: {
    initialBankroll: 1000,
    unitSizePercent: 1,
    currency: 'CAD',
  },
  bets: [],
};

export const SPORT_LEAGUES = [
  { label: 'MLB', path: 'baseball/mlb', emoji: '⚾' },
  { label: 'NHL', path: 'hockey/nhl', emoji: '🏒' },
  { label: 'NBA', path: 'basketball/nba', emoji: '🏀' },
  { label: 'WNBA', path: 'basketball/wnba', emoji: '🏀' },
  { label: 'NFL', path: 'football/nfl', emoji: '🏈' },
  { label: 'NCAAF', path: 'football/college-football', emoji: '🏈' },
  { label: 'NCAAB', path: 'basketball/mens-college-basketball', emoji: '🏀' },
  { label: 'EPL', path: 'soccer/eng.1', emoji: '⚽' },
  { label: 'La Liga', path: 'soccer/esp.1', emoji: '⚽' },
  { label: 'Serie A', path: 'soccer/ita.1', emoji: '⚽' },
  { label: 'Bundesliga', path: 'soccer/ger.1', emoji: '⚽' },
  { label: 'Ligue 1', path: 'soccer/fra.1', emoji: '⚽' },
  { label: 'MLS', path: 'soccer/usa.1', emoji: '⚽' },
  { label: 'UCL', path: 'soccer/uefa.champions', emoji: '⚽' },
  { label: 'Europa', path: 'soccer/uefa.europa', emoji: '⚽' },
  { label: 'UFC', path: 'mma/ufc', emoji: '🥊' },
  { label: 'ATP', path: 'tennis/atp', emoji: '🎾' },
  { label: 'WTA', path: 'tennis/wta', emoji: '🎾' },
  { label: 'PGA', path: 'golf/pga', emoji: '⛳' },
  { label: 'F1', path: 'racing/f1', emoji: '🏎️' },
  { label: 'Autre', path: null, emoji: '🎯' },
];

export const BET_TYPES = ['Moneyline', 'Spread/Run Line', 'Over/Under', 'Prop', 'Parlay', 'Futures', 'Autre'];

export async function fetchESPNGames(sportLabel, dateStr) {
  const league = SPORT_LEAGUES.find(s => s.label === sportLabel);
  if (!league || !league.path) return { games: [], error: null };
  const dateParam = (dateStr || '').replace(/-/g, '');
  const url = `https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard${dateParam ? `?dates=${dateParam}` : ''}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    const events = json.events || [];
    const games = events.map(e => {
      const comp = e.competitions?.[0] || {};
      const teams = comp.competitors || [];
      const home = teams.find(t => t.homeAway === 'home') || teams[0];
      const away = teams.find(t => t.homeAway === 'away') || teams[1];
      const state = e.status?.type?.state || 'pre';
      const statusDetail = e.status?.type?.shortDetail || '';
      const d = new Date(e.date);
      const localTime = d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
      const awayName = away?.team?.displayName || away?.athlete?.displayName || away?.team?.name || 'TBD';
      const homeName = home?.team?.displayName || home?.athlete?.displayName || home?.team?.name || 'TBD';
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
    return { games: [], error: err.message || 'Erreur réseau' };
  }
}

export function calcParlayOdds(legs) {
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

export const calcProfit = (stake, odds, status) => {
  const s = Number(stake) || 0;
  const o = Number(odds) || 0;
  if (status === 'pending') return 0;
  if (status === 'push' || status === 'void') return 0;
  if (status === 'lost') return -s;
  if (status === 'won') {
    return o > 0 ? s * (o / 100) : s * (100 / Math.abs(o));
  }
  return 0;
};

export const oddsToImplied = (odds) => {
  const o = Number(odds);
  if (!o) return 0;
  return o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100);
};

export const formatOdds = (o) => {
  const n = Number(o);
  if (!n) return '—';
  return n > 0 ? `+${n}` : `${n}`;
};

export function loadInitialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_DATA;
}

export function localDateString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(yyyymmdd) {
  if (!yyyymmdd) return new Date(NaN);
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
