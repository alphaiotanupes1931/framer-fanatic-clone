drop policy if exists "post-media read" on storage.objects;
create policy "post-media read" on storage.objects for select to anon, authenticated using (bucket_id = 'post-media');

drop policy if exists "Avatars are viewable by authenticated" on storage.objects;
create policy "Avatars are viewable by everyone" on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');