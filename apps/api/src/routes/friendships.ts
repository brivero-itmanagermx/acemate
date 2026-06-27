import { Hono } from 'hono';
import { supabase } from '../lib/supabase';

const friendships = new Hono();

// Static routes must come before /:id to prevent param swallowing

// GET /api/v1/friendships?userId= — accepted friends with profiles
friendships.get('/', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id, receiver_id, status, created_at, updated_at')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) return c.json({ error: error.message }, 500);
  if (!rows?.length) return c.json([]);

  const friendIds = rows.map(f =>
    f.requester_id === userId ? f.receiver_id : f.requester_id
  );

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, level')
    .in('id', friendIds)
    .is('deleted_at', null);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  return c.json(
    rows
      .map(f => {
        const friendId = f.requester_id === userId ? f.receiver_id : f.requester_id;
        return {
          id:         f.id,
          status:     f.status,
          created_at: f.created_at,
          updated_at: f.updated_at,
          friend:     profileMap[friendId] ?? null,
        };
      })
      .filter(f => f.friend !== null)
  );
});

// GET /api/v1/friendships/requests?userId= — pending requests received by userId
friendships.get('/requests', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id, receiver_id, status, created_at, updated_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending');

  if (error) return c.json({ error: error.message }, 500);
  if (!rows?.length) return c.json([]);

  const requesterIds = rows.map(f => f.requester_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, level')
    .in('id', requesterIds)
    .is('deleted_at', null);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  return c.json(
    rows
      .map(f => ({
        id:         f.id,
        status:     f.status,
        created_at: f.created_at,
        updated_at: f.updated_at,
        requester:  profileMap[f.requester_id] ?? null,
      }))
      .filter(f => f.requester !== null)
  );
});

// GET /api/v1/friendships/sent?userId= — pending requests sent by userId
friendships.get('/sent', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId required' }, 400);

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id, receiver_id, status, created_at, updated_at')
    .eq('requester_id', userId)
    .eq('status', 'pending');

  if (error) return c.json({ error: error.message }, 500);
  if (!rows?.length) return c.json([]);

  const receiverIds = rows.map(f => f.receiver_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, level')
    .in('id', receiverIds)
    .is('deleted_at', null);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  return c.json(
    rows
      .map(f => ({
        id:         f.id,
        status:     f.status,
        created_at: f.created_at,
        updated_at: f.updated_at,
        receiver:   profileMap[f.receiver_id] ?? null,
      }))
      .filter(f => f.receiver !== null)
  );
});

// GET /api/v1/friendships/between?userA=&userB= — friendship status from userA's perspective
friendships.get('/between', async (c) => {
  const userA = c.req.query('userA');
  const userB = c.req.query('userB');

  if (!userA || !userB) return c.json({ error: 'userA and userB required' }, 400);
  if (userA === userB)  return c.json({ friendshipId: null, friendshipStatus: 'none' });

  const { data: rows } = await supabase
    .from('friendships')
    .select('id, requester_id, status')
    .or(
      `and(requester_id.eq.${userA},receiver_id.eq.${userB}),` +
      `and(requester_id.eq.${userB},receiver_id.eq.${userA})`
    )
    .limit(1);

  const row = rows?.[0] ?? null;
  if (!row) return c.json({ friendshipId: null, friendshipStatus: 'none' });

  const friendshipStatus =
    row.status === 'accepted'                              ? 'accepted'          :
    row.status === 'pending' && row.requester_id === userA ? 'pending_sent'      :
                                                             'pending_received';

  return c.json({ friendshipId: row.id, friendshipStatus });
});

// POST /api/v1/friendships — send a friend request
friendships.post('/', async (c) => {
  const body = await c.req.json<{ requester_id: string; receiver_id: string }>();

  if (!body.requester_id || !body.receiver_id) {
    return c.json({ error: 'requester_id and receiver_id required' }, 400);
  }
  if (body.requester_id === body.receiver_id) {
    return c.json({ error: 'Cannot send a request to yourself' }, 400);
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: body.requester_id, receiver_id: body.receiver_id, status: 'pending' })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});

// PATCH /api/v1/friendships/:id — accept or reject a request
friendships.patch('/:id', async (c) => {
  const id   = c.req.param('id');
  const body = await c.req.json<{ status: 'accepted' | 'rejected' }>();

  if (!['accepted', 'rejected'].includes(body.status)) {
    return c.json({ error: 'status must be accepted or rejected' }, 400);
  }

  const { data, error } = await supabase
    .from('friendships')
    .update({ status: body.status })
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// DELETE /api/v1/friendships/:id — cancel a sent request or remove a friend
friendships.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const { error } = await supabase.from('friendships').delete().eq('id', id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ success: true });
});

export default friendships;
