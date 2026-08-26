CREATE OR REPLACE FUNCTION public.can_view_post_media(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, storage
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.is_deleted = false
      AND (
        p.image_url LIKE '%' || _object_name || '%'
        OR p.video_url LIKE '%' || _object_name || '%'
        OR p.music_url LIKE '%' || _object_name || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.media_urls, ARRAY[]::text[])) AS media_url
          WHERE media_url LIKE '%' || _object_name || '%'
        )
      )
      AND (
        p.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR COALESCE(p.visibility, 'public') = 'public'
        OR (
          p.visibility = 'followers'
          AND EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.following_id = p.user_id AND f.follower_id = auth.uid()
          )
        )
        OR (
          p.visibility = 'close_friends'
          AND EXISTS (
            SELECT 1 FROM public.close_friends cf
            WHERE cf.user_id = p.user_id AND cf.friend_id = auth.uid()
          )
        )
      )
  );
$$;