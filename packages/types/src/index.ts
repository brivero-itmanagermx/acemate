export type PlayerLevel      = 'beginner' | 'intermediate' | 'advanced' | 'competitive';
export type DominantHand     = 'left' | 'right';
export type Surface          = 'clay' | 'hard' | 'grass' | 'indoor';
export type MatchStatus      = 'pending' | 'confirmed' | 'disputed' | 'cancelled';
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

// Profile — camelCase; API transforms DB snake_case before returning
export interface Profile {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  level: PlayerLevel;
  dominantHand: DominantHand | null;
  preferredSurface: Surface | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SetScore {
  home: number;
  away: number;
}

// Match — snake_case mirrors DB columns (no transform in API)
export interface Match {
  id: string;
  player_home_id: string;
  /** Null when the opponent is unregistered — use opponent_name instead */
  player_away_id: string | null;
  opponent_name: string | null;
  opponent_email: string | null;
  winner_id: string | null;
  sets: SetScore[];
  surface: Surface | null;
  venue_id: string | null;
  location_name: string | null;
  played_at: string;
  status: MatchStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Compact profile returned inline in match feed responses
export interface PlayerSummary {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

// Match with joined player data and reaction counts
export interface MatchFeedItem extends Match {
  homePlayer: PlayerSummary | null;
  awayPlayer: PlayerSummary | null;
  aceCount: number;
  userHasAced: boolean;
}

export interface Venue {
  id:         string;
  created_by: string;
  name:       string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MatchReaction {
  id: string;
  match_id: string;
  user_id: string;
  created_at: string;
}

// ── Friendship / social types ─────────────────────────────────────────────────

// UI-facing friendship status (superset of DB status)
export type FriendshipStatusUI =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted';

// Compact player used in search results and friend lists
export interface PlayerProfile {
  id:         string;
  username:   string;
  full_name:  string | null;
  avatar_url: string | null;
  level:      string | null;
}

// Profile search result — includes friendship status relative to the requester
export interface PlayerSearchResult extends PlayerProfile {
  friendshipId:     string | null;
  friendshipStatus: FriendshipStatusUI;
}

// GET /api/v1/friendships — accepted friend entry
export interface FriendEntry {
  id:         string;
  status:     string;
  created_at: string;
  updated_at: string;
  friend:     PlayerProfile;
}

// GET /api/v1/friendships/requests — pending request received
export interface FriendRequest {
  id:         string;
  status:     string;
  created_at: string;
  updated_at: string;
  requester:  PlayerProfile;
}

// GET /api/v1/friendships/sent — pending request sent
export interface SentRequest {
  id:         string;
  status:     string;
  created_at: string;
  updated_at: string;
  receiver:   PlayerProfile;
}

// GET /api/v1/friendships/between?userA=&userB= — from userA's perspective
export interface FriendshipBetween {
  friendshipId:     string | null;
  friendshipStatus: FriendshipStatusUI;
}

// GET /api/v1/profiles/:id/stats
export interface ProfileStats {
  totalMatches:    number;
  wins:            number;
  losses:          number;
  winRate:         number;    // 0–100 percentage
  currentStreak:   number;    // positive = win streak, negative = loss streak, 0 = none
  longestStreak:   number;    // longest win streak ever
  favoriteSurface: string | null;
  favoriteVenue:   string | null;
}

// Single match in GET /api/v1/profiles/:id/matches
export interface ProfileMatchItem {
  id:              string;
  played_at:       string;
  surface:         Surface | null;
  winner_id:       string | null;
  sets:            SetScore[];   // empty when viewer has restricted access
  location_name:   string | null;
  is_home:         boolean;
  opponent:        PlayerSummary | null;
  opponent_name:   string | null;   // guest opponent name when not a registered player
  played_together: boolean;         // true if the viewer played this match vs the profile owner
}

// GET /api/v1/profiles/:id/matches response envelope
export interface ProfileMatchesResponse {
  items:      ProfileMatchItem[];
  total:      number;
  page:       number;
  limit:      number;
  fullAccess: boolean;
}
