CREATE OR REPLACE FUNCTION public.public_saved_posts(_user_id uuid, lim integer DEFAULT 60)
RETURNS TABLE(id uuid, content text, media_urls text[], post_type text, created_at timestamp with time zone, author_name text, author_username text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.content, p.media_urls, p.post_type, p.created_at,
         COALESCE(pr.display_name, pr.username), pr.username
  FROM public.post_saves s
  JOIN public.posts p ON p.id = s.post_id
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE s.user_id = _user_id
    AND COALESCE(p.visibility, 'public') = 'public'
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(lim, 60), 200));
$$;

GRANT EXECUTE ON FUNCTION public.public_saved_posts(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_attending_events(_user_id uuid, lim integer DEFAULT 60)
RETURNS TABLE(id uuid, title text, starts_at timestamp with time zone, location text, venue_name text, image_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT e.id, e.title, e.starts_at, e.location, e.venue_name, e.image_url
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.buyer_id = _user_id
    AND t.status = 'paid'
    AND COALESCE(e.is_published, true) = true
  ORDER BY e.starts_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(lim, 60), 200));
$$;

GRANT EXECUTE ON FUNCTION public.public_attending_events(uuid, integer) TO anon, authenticated;