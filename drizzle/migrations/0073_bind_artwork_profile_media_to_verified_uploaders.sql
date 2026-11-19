CREATE OR REPLACE FUNCTION public.post_media_artwork_uploader_matches_org(_org uuid, _uploader text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.can_view_org(_org) AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org AND (
      o.owner_id::text = _uploader
      OR EXISTS (
        SELECT 1 FROM public.organization_staff_logins l
        WHERE l.organization_id = o.id AND l.staff_user_id::text = _uploader
      )
    )
  );
$function$;
REVOKE ALL ON FUNCTION public.post_media_artwork_uploader_matches_org(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_media_artwork_uploader_matches_org(uuid, text) TO anon, authenticated, service_role;

ALTER POLICY "post-media artwork and profile media read" ON storage.objects
TO anon, authenticated
USING (
  bucket_id = 'post-media' AND (
    owner_id = (SELECT auth.uid()::text)
    OR (owner_id IS NULL AND (storage.foldername(name))[1] = (SELECT auth.uid()::text))
    OR EXISTS (
      SELECT 1 FROM public.organization_artworks a
      WHERE regexp_replace(split_part(a.media_url, '?', 1), '^https?://[^/]+/storage/v1/object/(sign|public|authenticated)/post-media/', '') IN (objects.name, 'post-media/' || objects.name)
      AND public.post_media_artwork_uploader_matches_org(a.org_id, COALESCE(objects.owner_id, (storage.foldername(objects.name))[1]))
    )
    OR EXISTS (
      SELECT 1 FROM public.profile_sections s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE regexp_replace(split_part(s.media_url, '?', 1), '^https?://[^/]+/storage/v1/object/(sign|public|authenticated)/post-media/', '') IN (objects.name, 'post-media/' || objects.name)
      AND COALESCE(objects.owner_id, (storage.foldername(objects.name))[1]) = s.user_id::text
    )
  )
);
COMMENT ON FUNCTION public.post_media_artwork_uploader_matches_org(uuid, text) IS 'Validates artwork uploader ownership or assigned staff membership and caller page visibility without exposing staff credentials.';