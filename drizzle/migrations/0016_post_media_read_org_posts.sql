CREATE POLICY "post-media org post media read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'post-media'
  AND EXISTS (
    SELECT 1 FROM public.organization_posts p
    WHERE public.can_view_org(p.org_id)
      AND (
        p.media_url ILIKE ('%' || objects.name || '%')
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(p.media_urls) = 'array' THEN p.media_urls ELSE '[]'::jsonb END
          ) u
          WHERE u ILIKE ('%' || objects.name || '%')
        )
      )
  )
);