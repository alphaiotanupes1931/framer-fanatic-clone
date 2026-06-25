
-- 1. Backfill role = 'artist' for everyone who isn't a hidden test account
UPDATE public.profiles
SET role = 'artist', updated_at = now()
WHERE COALESCE(hidden_from_showcase, false) = false
  AND COALESCE(banned, false) = false
  AND role IS DISTINCT FROM 'artist';

-- Mirror into user_roles so role-gated UI works for them too
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'artist'::app_role
FROM public.profiles p
WHERE COALESCE(p.hidden_from_showcase, false) = false
  AND COALESCE(p.banned, false) = false
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Broaden creator search to include everyone visible, ordered by recency
CREATE OR REPLACE FUNCTION public.search_creators(q text DEFAULT ''::text, lim integer DEFAULT 24)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, role text, neighborhood text, bio text, in_baltimore boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.role, p.neighborhood, p.bio, p.in_baltimore
  FROM public.profiles p
  WHERE COALESCE(p.banned, false) = false
    AND COALESCE(p.hidden_from_showcase, false) = false
    AND (
      coalesce(q,'') = ''
      OR p.display_name ILIKE '%'||q||'%'
      OR p.username     ILIKE '%'||q||'%'
      OR p.neighborhood ILIKE '%'||q||'%'
      OR p.bio          ILIKE '%'||q||'%'
    )
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 100));
$function$;

-- 3. Ensure realtime broadcast is on for messages + conversations
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Make sure full row data is broadcast so the client can render new messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
