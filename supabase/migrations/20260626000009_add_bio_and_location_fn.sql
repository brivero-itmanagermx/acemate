-- Add bio column (safe if it already exists from an earlier migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;

-- PostgreSQL function to extract raw coordinates for API-side use only.
-- The Hono API calls this via supabase.rpc() with the service role key.
-- Raw coordinates are NEVER returned to clients — the API fuzzes them first.
CREATE OR REPLACE FUNCTION extract_profile_coordinates(profile_id uuid)
RETURNS TABLE(lat double precision, lng double precision)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lng
  FROM profiles
  WHERE id = profile_id
    AND location   IS NOT NULL
    AND deleted_at IS NULL;
$$;
