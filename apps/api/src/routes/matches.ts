import { Hono } from 'hono';
import { supabase } from '../lib/supabase';

const matches = new Hono();

matches.get('/', async (c) => {
  const userId      = c.req.query('userId');
  const requesterId = c.req.query('requesterId') ?? userId;

  if (!userId) return c.json({ error: 'userId required' }, 400);

  const { data: rows, error } = await supabase
    .from('matches')
    .select('*')
    .or(`player_home_id.eq.${userId},player_away_id.eq.${userId}`)
    .is('deleted_at', null)
    .order('played_at', { ascending: false })
    .limit(20);

  if (error) return c.json({ error: error.message }, 500);
  if (!rows?.length) return c.json([]);

  const playerIds = [
    ...new Set(rows.flatMap(m => [m.player_home_id, m.player_away_id].filter(Boolean)))
  ] as string[];

  const matchIds = rows.map(m => m.id);

  const [{ data: playerRows }, { data: reactions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', playerIds),
    supabase
      .from('match_reactions')
      .select('match_id, user_id')
      .in('match_id', matchIds),
  ]);

  const profileMap  = Object.fromEntries((playerRows ?? []).map(p => [p.id, p]));
  const reactionMap = (reactions ?? []).reduce<Record<string, string[]>>((acc, r) => {
    (acc[r.match_id] ??= []).push(r.user_id);
    return acc;
  }, {});

  return c.json(rows.map(m => ({
    ...m,
    homePlayer:  profileMap[m.player_home_id] ?? null,
    awayPlayer:  m.player_away_id ? (profileMap[m.player_away_id] ?? null) : null,
    aceCount:    reactionMap[m.id]?.length ?? 0,
    userHasAced: reactionMap[m.id]?.includes(requesterId!) ?? false,
  })));
});

matches.post('/', async (c) => {
  const body = await c.req.json<{
    player_home_id:  string;
    player_away_id?: string | null;
    opponent_name?:  string | null;
    opponent_email?: string | null;
    sets:            { home: number; away: number }[];
    surface?:        string | null;
    venue_id?:       string | null;
    location_name?:  string | null;  // accepted for backward compat; overridden by venue_id
    played_at:       string;
    winner?:         'home' | 'away' | null;
    notes?:          string | null;
  }>();

  if (!body.player_home_id) return c.json({ error: 'player_home_id required' }, 400);
  if (!body.player_away_id && !body.opponent_name) {
    return c.json({ error: 'player_away_id or opponent_name required' }, 400);
  }

  // Resolve venue: look up name to populate location_name for backward compat
  let venue_id:      string | null = body.venue_id ?? null;
  let location_name: string | null = body.location_name ?? null;

  if (venue_id) {
    const { data: venue } = await supabase
      .from('venues')
      .select('name')
      .eq('id', venue_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (venue) {
      location_name = venue.name;
    } else {
      venue_id = null;  // venue not found or soft-deleted — ignore it
    }
  }

  const winner_id =
    body.winner === 'home'                        ? body.player_home_id :
    body.winner === 'away' && body.player_away_id ? body.player_away_id :
    null;

  const { data, error } = await supabase
    .from('matches')
    .insert({
      player_home_id:  body.player_home_id,
      player_away_id:  body.player_away_id  ?? null,
      opponent_name:   body.opponent_name   ?? null,
      opponent_email:  body.opponent_email  ?? null,
      sets:            body.sets            ?? [],
      surface:         body.surface         ?? null,
      venue_id,
      location_name,
      played_at:       body.played_at,
      winner_id,
      status:          winner_id != null ? 'confirmed' : 'pending',
      notes:           body.notes           ?? null,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});

// Toggle the "Ace!" reaction — adds if absent, removes if present
matches.post('/:id/react', async (c) => {
  const matchId = c.req.param('id');
  const body    = await c.req.json<{ user_id: string }>();

  if (!body.user_id) return c.json({ error: 'user_id required' }, 400);

  const { data: existing } = await supabase
    .from('match_reactions')
    .select('id')
    .eq('match_id', matchId)
    .eq('user_id', body.user_id)
    .maybeSingle();

  if (existing) {
    await supabase.from('match_reactions').delete().eq('id', existing.id);
  } else {
    await supabase.from('match_reactions').insert({ match_id: matchId, user_id: body.user_id });
  }

  const { count } = await supabase
    .from('match_reactions')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId);

  return c.json({ reacted: !existing, count: count ?? 0 });
});

export default matches;
