import { Hono } from 'hono';
import { supabase } from '../lib/supabase';
import { fuzzCoordinates, getCity } from '../lib/location';

const profiles = new Hono();

// Static routes must be registered before /:id to avoid param swallowing

profiles.get('/username-check', async (c) => {
  const username  = c.req.query('username')?.toLowerCase().trim();
  const excludeId = c.req.query('excludeId');

  if (!username || username.length < 3) return c.json({ available: false });

  let query = supabase.from('profiles').select('id').eq('username', username).is('deleted_at', null);
  if (excludeId) query = query.neq('id', excludeId);

  const { data } = await query.maybeSingle();
  return c.json({ available: !data });
});

profiles.get('/search', async (c) => {
  const q           = c.req.query('q')?.trim() ?? '';
  const excludeId   = c.req.query('excludeId');
  const requesterId = c.req.query('requesterId');
  const limit       = Math.min(Number(c.req.query('limit') ?? 10), 20);

  if (q.length < 2) return c.json([]);

  let query = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, level')
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .is('deleted_at', null)
    .limit(limit);

  if (excludeId) query = query.neq('id', excludeId);

  const { data } = await query;
  if (!data?.length) return c.json([]);

  if (!requesterId) return c.json(data);

  // Enrich results with friendship status relative to requesterId
  const { data: fships } = await supabase
    .from('friendships')
    .select('id, requester_id, receiver_id, status')
    .or(`requester_id.eq.${requesterId},receiver_id.eq.${requesterId}`);

  const fmap: Record<string, { id: string; status: string; isSender: boolean }> = {};
  (fships ?? []).forEach(f => {
    const otherId  = f.requester_id === requesterId ? f.receiver_id : f.requester_id;
    const isSender = f.requester_id === requesterId;
    fmap[otherId]  = { id: f.id, status: f.status, isSender };
  });

  return c.json(data.map(profile => {
    const fs = fmap[profile.id];
    const friendshipStatus =
      !fs                                    ? 'none'             :
      fs.status === 'accepted'               ? 'accepted'         :
      fs.status === 'pending' && fs.isSender ? 'pending_sent'     :
                                               'pending_received';
    return { ...profile, friendshipId: fs?.id ?? null, friendshipStatus };
  }));
});

// GET /:id/location — returns the approximate city/region for a profile.
// Coordinates are extracted via DB function, fuzzed, then reverse-geocoded.
// Raw coordinates never leave this handler.
profiles.get('/:id/location', async (c) => {
  const id = c.req.param('id');

  const { data: rows } = await supabase.rpc('extract_profile_coordinates', { profile_id: id });

  if (!rows || !Array.isArray(rows) || !rows.length) {
    return c.json({ city: null });
  }

  const { lat, lng } = rows[0] as { lat: number; lng: number };
  const fuzzed = fuzzCoordinates(lat, lng);
  const city   = await getCity(fuzzed.lat, fuzzed.lng);

  return c.json({ city });
});

// GET /:id/stats — aggregate match statistics for a profile
profiles.get('/:id/stats', async (c) => {
  const id = c.req.param('id');

  const { data: rows, error } = await supabase
    .from('matches')
    .select('winner_id, surface, venue_id, played_at')
    .or(`player_home_id.eq.${id},player_away_id.eq.${id}`)
    .neq('status', 'cancelled')
    .is('deleted_at', null)
    .order('played_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

  const ms = rows ?? [];
  let wins = 0;
  let losses = 0;
  const surfaceCount: Record<string, number> = {};
  const venueCount:   Record<string, number> = {};

  for (const m of ms) {
    if (m.winner_id === id) wins++;
    else if (m.winner_id !== null) losses++;
    if (m.surface)  surfaceCount[m.surface]  = (surfaceCount[m.surface]  ?? 0) + 1;
    if (m.venue_id) venueCount[m.venue_id]   = (venueCount[m.venue_id]   ?? 0) + 1;
  }

  const decidedCount = wins + losses;
  const winRate = decidedCount > 0 ? Math.round((wins / decidedCount) * 100) : 0;

  // Current streak — consecutive decided matches from most recent
  let currentStreak = 0;
  let streakIsWin   = false;
  let streakStarted = false;
  for (const m of ms) {
    if (m.winner_id === null) continue;
    const won = m.winner_id === id;
    if (!streakStarted) {
      streakIsWin = won; currentStreak = 1; streakStarted = true;
    } else if (won === streakIsWin) {
      currentStreak++;
    } else {
      break;
    }
  }
  if (streakStarted && !streakIsWin) currentStreak = -currentStreak;

  // Longest win streak — traverse chronologically
  let longestStreak = 0;
  let curRun = 0;
  for (const m of ms.slice().reverse()) {
    if (m.winner_id === id)          { curRun++; longestStreak = Math.max(longestStreak, curRun); }
    else if (m.winner_id !== null)   { curRun = 0; }
  }

  const favoriteSurface = Object.entries(surfaceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteVenueId = Object.entries(venueCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  let favoriteVenue: string | null = null;
  if (favoriteVenueId) {
    const { data: v } = await supabase.from('venues').select('name').eq('id', favoriteVenueId).maybeSingle();
    favoriteVenue = v?.name ?? null;
  }

  return c.json({ totalMatches: ms.length, wins, losses, winRate, currentStreak, longestStreak, favoriteSurface, favoriteVenue });
});

// GET /:id/matches?page=&limit=&requesterId= — paginated match history with privacy gating
profiles.get('/:id/matches', async (c) => {
  const id          = c.req.param('id');
  const requesterId = c.req.query('requesterId');
  const page        = Math.max(1, parseInt(c.req.query('page') ?? '1'));

  // Determine access level: own profile or accepted friend → full history; otherwise → last 3, no scores
  let fullAccess = false;
  if (requesterId === id) {
    fullAccess = true;
  } else if (requesterId) {
    const { data: frows } = await supabase
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${requesterId},receiver_id.eq.${id}),` +
        `and(requester_id.eq.${id},receiver_id.eq.${requesterId})`
      )
      .limit(1);
    fullAccess = (frows?.length ?? 0) > 0;
  }

  const limit  = fullAccess ? Math.min(parseInt(c.req.query('limit') ?? '10'), 20) : 3;
  const offset = fullAccess ? (page - 1) * limit : 0;

  const { data: rows, count, error } = await supabase
    .from('matches')
    .select('*', { count: 'exact' })
    .or(`player_home_id.eq.${id},player_away_id.eq.${id}`)
    .neq('status', 'cancelled')
    .is('deleted_at', null)
    .order('played_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return c.json({ error: error.message }, 500);
  if (!rows?.length) return c.json({ items: [], total: 0, page, limit, fullAccess });

  const opponentIds = [...new Set(
    rows.flatMap(m => {
      const oppId = m.player_home_id === id ? m.player_away_id : m.player_home_id;
      return oppId ? [oppId] : [];
    })
  )] as string[];

  const { data: opponentProfiles } = opponentIds.length
    ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', opponentIds)
    : { data: [] };

  const profileMap = Object.fromEntries((opponentProfiles ?? []).map(p => [p.id, p]));

  const items = rows.map(m => {
    const isHome   = m.player_home_id === id;
    const oppId    = isHome ? m.player_away_id : m.player_home_id;
    const opponent = oppId ? (profileMap[oppId] ?? null) : null;

    return {
      id:              m.id,
      played_at:       m.played_at,
      surface:         m.surface,
      winner_id:       m.winner_id,
      sets:            fullAccess ? (m.sets ?? []) : [],
      location_name:   m.location_name,
      is_home:         isHome,
      opponent,
      opponent_name:   isHome ? (m.opponent_name ?? null) : null,
      played_together: !!requesterId && !!oppId && oppId === requesterId,
    };
  });

  return c.json({ items, total: count ?? 0, page, limit, fullAccess });
});

profiles.get('/:id', async (c) => {
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) return c.json({ error: 'Profile not found' }, 404);

  // Transform to camelCase to match the shared Profile type
  return c.json({
    id:               data.id,
    username:         data.username,
    fullName:         data.full_name,
    avatarUrl:        data.avatar_url,
    bio:              data.bio,
    level:            data.level,
    dominantHand:     data.dominant_hand,
    preferredSurface: data.preferred_surface,
    createdAt:        data.created_at,
    updatedAt:        data.updated_at,
    deletedAt:        data.deleted_at,
  });
});

profiles.patch('/:id', async (c) => {
  const id = c.req.param('id');

  const body = await c.req.json<{
    full_name?:         string | null;
    username?:          string;
    bio?:               string | null;
    avatar_url?:        string | null;
    level?:             string | null;
    dominant_hand?:     string | null;
    preferred_surface?: string | null;
    latitude?:          number;
    longitude?:         number;
  }>();

  const update: Record<string, unknown> = {};

  if ('full_name'         in body) update.full_name         = body.full_name;
  if ('username'          in body) update.username          = body.username;
  if ('bio'               in body) update.bio               = body.bio;
  if ('avatar_url'        in body) update.avatar_url        = body.avatar_url;
  if ('level'             in body) update.level             = body.level;
  if ('dominant_hand'     in body) update.dominant_hand     = body.dominant_hand;
  if ('preferred_surface' in body) update.preferred_surface = body.preferred_surface;

  if (typeof body.latitude === 'number' && typeof body.longitude === 'number') {
    update.location = `SRID=4326;POINT(${body.longitude} ${body.latitude})`;
  }

  if (Object.keys(update).length === 0) return c.json({ error: 'No fields to update' }, 400);

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

export default profiles;
