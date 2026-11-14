DROP POLICY IF EXISTS "post-media artwork and profile media read" ON storage.objects;
CREATE POLICY "post-media artwork and profile media read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'post-media' AND (
  owner_id = (SELECT auth.uid()::text)
  OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.organization_artworks a
             WHERE a.media_url ILIKE '%'||objects.name||'%' AND public.can_view_org(a.org_id))
  OR EXISTS (SELECT 1 FROM public.profile_sections s
             JOIN public.profiles p ON p.id = s.user_id
             WHERE s.media_url ILIKE '%'||objects.name||'%'
               AND (objects.owner_id IS NULL OR objects.owner_id = s.user_id::text))
));