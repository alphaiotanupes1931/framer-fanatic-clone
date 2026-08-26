CREATE POLICY "post-media artwork and profile media read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'post-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.organization_artworks a
      WHERE a.media_url ILIKE '%' || objects.name
        AND public.can_view_org(a.org_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.profile_sections s
      WHERE s.media_url ILIKE '%' || objects.name
    )
  )
);