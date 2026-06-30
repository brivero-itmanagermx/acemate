import { supabase } from './supabase';
import type {
  Profile,
  ProfileStats,
  ProfileMatchesResponse,
  MatchFeedItem,
  PlayerSearchResult,
  FriendEntry,
  FriendRequest,
  SentRequest,
  FriendshipBetween,
  Venue,
} from '@acemate/types';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
console.log('[API] base URL:', BASE);

async function headers(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE}${path}`;
  console.log(`[API] ${method} ${url}`);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: await headers(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    console.error(`[API] ${method} ${url} NETWORK ERROR — is EXPO_PUBLIC_API_URL set to the Railway URL? Got:`, BASE, '\n', (err as Error).message);
    throw err;
  }
  if (!res.ok) {
    console.error(`[API] ${method} ${url} → HTTP ${res.status}`);
    throw new Error(`${method} ${path} → ${res.status}`);
  }
  if (method === 'DELETE') return undefined as unknown as T;
  return res.json() as Promise<T>;
}

const get  = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
const del  = (path: string) => request<void>('DELETE', path);

export const api = {
  profiles: {
    get: (id: string) =>
      get<Profile>(`/api/v1/profiles/${id}`),
    patch: (id: string, body: Record<string, unknown>) =>
      patch<Profile>(`/api/v1/profiles/${id}`, body),
    stats: (id: string) =>
      get<ProfileStats>(`/api/v1/profiles/${id}/stats`),
    // requesterId enables full access (own profile) or limited view (public/friend)
    matches: (id: string, page = 1, requesterId?: string, limit = 10) =>
      get<ProfileMatchesResponse>(
        `/api/v1/profiles/${id}/matches?page=${page}&limit=${limit}` +
        (requesterId ? `&requesterId=${requesterId}` : '')
      ),
    // requesterId enriches results with friendshipStatus; excludeId removes self from results
    search: (q: string, userId?: string) =>
      get<PlayerSearchResult[]>(
        `/api/v1/profiles/search?q=${encodeURIComponent(q)}` +
        (userId ? `&requesterId=${userId}&excludeId=${userId}` : '')
      ),
  },

  matches: {
    // Actual route: GET /api/v1/matches?userId=&requesterId=  (no /feed/:userId, no pagination)
    feed: (userId: string) =>
      get<MatchFeedItem[]>(`/api/v1/matches?userId=${userId}&requesterId=${userId}`),
    create: (body: Record<string, unknown>) =>
      post<{ id: string }>(`/api/v1/matches`, body),
    // Actual route: POST /api/v1/matches/:id/react — single toggle endpoint for both ace and unace
    ace: (matchId: string, userId: string) =>
      post<{ reacted: boolean; count: number }>(`/api/v1/matches/${matchId}/react`, { user_id: userId }),
    unace: (matchId: string, userId: string) =>
      post<{ reacted: boolean; count: number }>(`/api/v1/matches/${matchId}/react`, { user_id: userId }),
  },

  friendships: {
    // All three list endpoints require userId as a query param
    list: (userId: string) =>
      get<FriendEntry[]>(`/api/v1/friendships?userId=${userId}`),
    requests: (userId: string) =>
      get<FriendRequest[]>(`/api/v1/friendships/requests?userId=${userId}`),
    sent: (userId: string) =>
      get<SentRequest[]>(`/api/v1/friendships/sent?userId=${userId}`),
    between: (userA: string, userB: string) =>
      get<FriendshipBetween>(`/api/v1/friendships/between?userA=${userA}&userB=${userB}`),
    send: (requesterId: string, receiverId: string) =>
      post<{ id: string }>(`/api/v1/friendships`, { requester_id: requesterId, receiver_id: receiverId }),
    respond: (id: string, status: 'accepted' | 'rejected') =>
      patch<void>(`/api/v1/friendships/${id}`, { status }),
    remove: (id: string) =>
      del(`/api/v1/friendships/${id}`),
  },

  venues: {
    // Actual query param is userId, not created_by
    list: (userId: string) =>
      get<Venue[]>(`/api/v1/venues?userId=${userId}`),
    create: (name: string, createdBy: string) =>
      post<Venue>(`/api/v1/venues`, { name, created_by: createdBy }),
  },
};
