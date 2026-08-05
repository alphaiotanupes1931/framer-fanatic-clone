-- 1) Profiles: remove anonymous full-row read
DROP POLICY IF EXISTS "Anyone can view public profile fields" ON public.profiles;

CREATE POLICY "Members can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (COALESCE(banned, false) = false AND COALESCE(hidden_from_showcase, false) = false);

REVOKE SELECT ON public.profiles FROM anon;

-- 2) post-media: visibility-aware reads
DROP POLICY IF EXISTS "post-media read" ON storage.objects;

CREATE POLICY "post-media visibility aware read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'post-media'
  AND (
    (storage.foldername(name))[1] = COALESCE(auth.uid()::text, '')
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.is_deleted = false
        AND (
          p.image_url LIKE '%' || name
          OR p.video_url LIKE '%' || name
          OR p.music_url LIKE '%' || name
          OR EXISTS (SELECT 1 FROM unnest(p.media_urls) mu WHERE mu LIKE '%' || name)
        )
        AND (
          p.visibility = 'public'
          OR (p.visibility = 'followers' AND EXISTS (
                SELECT 1 FROM public.follows f
                WHERE f.following_id = p.user_id AND f.follower_id = auth.uid()))
          OR (p.visibility = 'close_friends' AND EXISTS (
                SELECT 1 FROM public.close_friends cf
                WHERE cf.user_id = p.user_id AND cf.friend_id = auth.uid()))
        )
    )
  )
);