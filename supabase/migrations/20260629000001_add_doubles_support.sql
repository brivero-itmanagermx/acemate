-- Doubles support: add match_type and extra player slots

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_type      text NOT NULL DEFAULT 'singles'
    CHECK (match_type IN ('singles', 'doubles')),
  ADD COLUMN IF NOT EXISTS player_home2_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS player_away2_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS partner_name    text,
  ADD COLUMN IF NOT EXISTS partner_email   text,
  ADD COLUMN IF NOT EXISTS opponent2_name  text,
  ADD COLUMN IF NOT EXISTS opponent2_email text;
