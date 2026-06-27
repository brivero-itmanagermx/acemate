-- Storage RLS policies for the avatars bucket.
-- The bucket itself must exist (created via Supabase dashboard or management API);
-- storage policies live in storage.objects and are managed through SQL like any other RLS.

-- 1. Authenticated users can INSERT files whose path starts with their own user ID.
--    Storage paths are in the form: {userId}/avatar.{ext}
--    storage.foldername(name) returns an array of path segments; element [1] is the first folder.
create policy "avatars: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Anyone (including unauthenticated visitors) can read files in this public bucket.
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- 3. Authenticated users can UPDATE (overwrite) only their own files.
create policy "avatars: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Authenticated users can DELETE only their own files.
create policy "avatars: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
