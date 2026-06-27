import { Hono } from 'hono';
import { supabase } from '../lib/supabase';

const venues = new Hono();

venues.get('/', async (c) => {
  const q      = c.req.query('q')?.trim() ?? '';
  const userId = c.req.query('userId');
  const limit  = Math.min(Number(c.req.query('limit') ?? 10), 20);

  // No query — return the user's own venues (for chips / initial load)
  if (!q) {
    if (!userId) return c.json([]);
    const { data } = await supabase
      .from('venues')
      .select('id, name, created_by')
      .eq('created_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    return c.json(data ?? []);
  }

  if (!userId) {
    // Global search with no user context
    const { data } = await supabase
      .from('venues')
      .select('id, name, created_by')
      .ilike('name', `%${q}%`)
      .is('deleted_at', null)
      .limit(limit);
    return c.json(data ?? []);
  }

  // Authenticated search: user's own venues first, then others
  const half = Math.ceil(limit / 2);
  const [{ data: own }, { data: others }] = await Promise.all([
    supabase
      .from('venues')
      .select('id, name, created_by')
      .eq('created_by', userId)
      .ilike('name', `%${q}%`)
      .is('deleted_at', null)
      .limit(half),
    supabase
      .from('venues')
      .select('id, name, created_by')
      .neq('created_by', userId)
      .ilike('name', `%${q}%`)
      .is('deleted_at', null)
      .limit(half),
  ]);

  const combined = [...(own ?? []), ...(others ?? [])].slice(0, limit);
  return c.json(combined);
});

venues.post('/', async (c) => {
  const body = await c.req.json<{
    name:        string;
    created_by:  string;
    latitude?:   number;
    longitude?:  number;
  }>();

  if (!body.name?.trim())  return c.json({ error: 'name required' }, 400);
  if (!body.created_by)    return c.json({ error: 'created_by required' }, 400);

  const insert: Record<string, unknown> = {
    name:       body.name.trim(),
    created_by: body.created_by,
  };

  if (typeof body.latitude === 'number' && typeof body.longitude === 'number') {
    insert.location = `SRID=4326;POINT(${body.longitude} ${body.latitude})`;
  }

  const { data, error } = await supabase
    .from('venues')
    .insert(insert)
    .select('id, name, created_by')
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});

export default venues;
