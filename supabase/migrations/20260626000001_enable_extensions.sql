-- Enable PostGIS for geographic/geospatial queries
create extension if not exists postgis;

-- Reusable trigger function to keep updated_at current on any table
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
