import { createClient } from '@supabase/supabase-js';
import { STORAGE_KEY } from './utils.js';

const SUPABASE_URL = 'https://izaevirxgzamppuumfnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6YWV2aXJ4Z3phbXBwdXVtZm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjI0NjksImV4cCI6MjA5MjczODQ2OX0.J1YBUJPdnRATWz4mnknHroed8-yPLx5E18ZhmfSfLpQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function signUp(email, password, displayName) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

const betFromRow = (r) => ({
  id: r.id,
  date: r.date,
  sport: r.sport,
  match: r.match,
  description: r.description,
  betType: r.bet_type,
  odds: Number(r.odds),
  stake: Number(r.stake),
  status: r.status,
  notes: r.notes || '',
  legs: r.legs || [],
});

const betToRow = (b, userId) => ({
  user_id: userId,
  date: b.date,
  sport: b.sport,
  match: b.match,
  description: b.description,
  bet_type: b.betType,
  odds: Number(b.odds),
  stake: Number(b.stake),
  status: b.status,
  notes: b.notes || '',
  legs: b.legs || [],
});

export async function loadUserData(userId) {
  const [profileRes, betsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('bets').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (betsRes.error) throw betsRes.error;

  const p = profileRes.data;
  return {
    settings: {
      initialBankroll: Number(p?.initial_bankroll ?? 1000),
      unitSizePercent: Number(p?.unit_size_percent ?? 1),
      currency: p?.currency ?? 'CAD',
      displayName: p?.display_name ?? '',
    },
    bets: (betsRes.data || []).map(betFromRow),
  };
}

export async function updateProfile(userId, settings) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    initial_bankroll: Number(settings.initialBankroll),
    unit_size_percent: Number(settings.unitSizePercent),
    currency: settings.currency,
  });
  if (error) throw error;
}

export async function insertBet(userId, bet) {
  const { data, error } = await supabase
    .from('bets')
    .insert(betToRow(bet, userId))
    .select()
    .single();
  if (error) throw error;
  return betFromRow(data);
}

export async function updateBet(userId, id, bet) {
  const row = betToRow(bet, userId);
  delete row.user_id;
  const { data, error } = await supabase
    .from('bets')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return betFromRow(data);
}

export async function patchBetStatus(userId, id, status) {
  const { data, error } = await supabase
    .from('bets')
    .update({ status })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return betFromRow(data);
}

export async function deleteBet(userId, id) {
  const { error } = await supabase
    .from('bets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function migrateLocalStorageIfNeeded(userId) {
  try {
    const { count } = await supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) > 0) return { migrated: 0 };

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { migrated: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed?.bets?.length && !parsed?.settings) return { migrated: 0 };

    if (parsed.settings) {
      await updateProfile(userId, parsed.settings);
    }

    let migrated = 0;
    if (parsed.bets?.length) {
      const rows = parsed.bets.map(b => betToRow(b, userId));
      const { error } = await supabase.from('bets').insert(rows);
      if (error) throw error;
      migrated = rows.length;
    }

    localStorage.setItem(STORAGE_KEY + ':migrated', new Date().toISOString());
    return { migrated };
  } catch (e) {
    console.error('Migration error:', e);
    return { migrated: 0, error: e.message };
  }
}
