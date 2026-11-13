DROP POLICY IF EXISTS "Avatars are viewable by everyone" ON storage.objects;
CREATE POLICY "Avatars are viewable by everyone" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars' AND (owner_id = (select auth.uid()::text)
  OR (storage.foldername(name))[1] = (select auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id::text = (storage.foldername(objects.name))[1])));

DROP POLICY IF EXISTS "Public can read event images" ON storage.objects;
DROP POLICY IF EXISTS "event-images public read" ON storage.objects;
CREATE POLICY "event-images public read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'event-images' AND (owner_id = (select auth.uid()::text)
  OR (storage.foldername(name))[1] = (select auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id::text = (storage.foldername(objects.name))[1])));

DROP POLICY IF EXISTS "story-covers public read" ON storage.objects;
CREATE POLICY "story-covers public read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'story-covers' AND (owner_id = (select auth.uid()::text)
  OR (storage.foldername(name))[1] = (select auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id::text = (storage.foldername(objects.name))[1])));

DROP POLICY IF EXISTS "Anyone can view podcast media" ON storage.objects;
CREATE POLICY "Anyone can view podcast media" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'podcast-media' AND (owner_id = (select auth.uid()::text)
  OR (storage.foldername(name))[1] = (select auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id::text = (storage.foldername(objects.name))[1])));

DROP POLICY IF EXISTS "post-media visibility aware read" ON storage.objects;
CREATE POLICY "post-media visibility aware read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'post-media' AND (owner_id = (select auth.uid()::text)
  OR (storage.foldername(name))[1] = (select auth.uid()::text)
  OR (public.can_view_post_media(name)
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id::text = (storage.foldername(objects.name))[1]))));

DROP POLICY IF EXISTS "post-media artwork and profile media read" ON storage.objects;
CREATE POLICY "post-media artwork and profile media read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'post-media' AND (owner_id = (select auth.uid()::text)
  OR (EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id::text = (storage.foldername(objects.name))[1])
      AND (EXISTS (SELECT 1 FROM public.organization_artworks a
                   WHERE a.media_url ILIKE ('%' || objects.name || '%') AND public.can_view_org(a.org_id))
        OR EXISTS (SELECT 1 FROM public.profile_sections s
                   WHERE s.media_url ILIKE ('%' || objects.name || '%'))))));