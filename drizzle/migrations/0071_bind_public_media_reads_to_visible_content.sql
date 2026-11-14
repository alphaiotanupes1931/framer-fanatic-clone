CREATE OR REPLACE FUNCTION public.storage_media_is_referenced(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT _name IS NOT NULL AND length(_name) > 0 AND (
       EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_url ILIKE '%'||_name||'%' OR p.banner_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.avatar_url ILIKE '%'||_name||'%' OR o.banner_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.events e WHERE concat_ws(' ', e.image_url, e.video_url, e.gallery_urls::text, e.description) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.stories s WHERE concat_ws(' ', s.cover_url, s.content) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.ephemeral_stories s WHERE s.media_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.podcast_episodes s WHERE concat_ws(' ', s.audio_url, s.video_url, s.cover_url) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.posts s WHERE concat_ws(' ', s.image_url, s.video_url, s.music_url, s.media_urls::text, s.link_image, s.content) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_posts s WHERE concat_ws(' ', s.media_url, s.video_url, s.media_urls::text) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_artworks s WHERE concat_ws(' ', s.media_url, s.album_cover) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.profile_sections s WHERE s.media_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_tracks s WHERE concat_ws(' ', s.audio_url, s.cover_url) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_releases s WHERE s.cover_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_videos s WHERE concat_ws(' ', s.video_url, s.thumbnail_url) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.videos s WHERE concat_ws(' ', s.video_url, s.thumbnail_url) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_products s WHERE s.image_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_product_categories s WHERE s.cover_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_exhibitions s WHERE s.cover_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_exhibition_images s WHERE s.media_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_artists s WHERE s.photo_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_board_members s WHERE s.photo_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_sponsors s WHERE s.logo_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_support_tiers s WHERE s.image_url ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.organization_comments s WHERE s.media_urls::text ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.messages s WHERE concat_ws(' ', s.image_url, s.content) ILIKE '%'||_name||'%')
    OR EXISTS (SELECT 1 FROM public.conversations s WHERE s.image_url ILIKE '%'||_name||'%')
  )
$$;
GRANT EXECUTE ON FUNCTION public.storage_media_is_referenced(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Avatars are viewable by everyone" ON storage.objects;
CREATE POLICY "Avatars are viewable by everyone" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars' AND (owner_id = (SELECT auth.uid()::text) OR (storage.foldername(name))[1] = (SELECT auth.uid()::text) OR public.storage_media_is_referenced(name)));

DROP POLICY IF EXISTS "event-images public read" ON storage.objects;
CREATE POLICY "event-images public read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'event-images' AND (owner_id = (SELECT auth.uid()::text) OR (storage.foldername(name))[1] = (SELECT auth.uid()::text) OR public.storage_media_is_referenced(name)));

DROP POLICY IF EXISTS "story-covers public read" ON storage.objects;
CREATE POLICY "story-covers public read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'story-covers' AND (owner_id = (SELECT auth.uid()::text) OR (storage.foldername(name))[1] = (SELECT auth.uid()::text) OR public.storage_media_is_referenced(name)));

DROP POLICY IF EXISTS "Anyone can view podcast media" ON storage.objects;
CREATE POLICY "Anyone can view podcast media" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'podcast-media' AND (owner_id = (SELECT auth.uid()::text) OR (storage.foldername(name))[1] = (SELECT auth.uid()::text) OR public.storage_media_is_referenced(name)));

DROP POLICY IF EXISTS "post-media artwork and profile media read" ON storage.objects;
CREATE POLICY "post-media artwork and profile media read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'post-media' AND (owner_id = (SELECT auth.uid()::text) OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.organization_artworks a WHERE a.media_url ILIKE '%'||objects.name||'%' AND public.can_view_org(a.org_id))
  OR EXISTS (SELECT 1 FROM public.profile_sections s WHERE s.media_url ILIKE '%'||objects.name||'%')));