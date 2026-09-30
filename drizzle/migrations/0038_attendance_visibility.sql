CREATE TABLE public.attendance_visibility (
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','friends','private')),
  PRIMARY KEY (user_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_visibility TO authenticated;
GRANT ALL ON public.attendance_visibility TO service_role;
ALTER TABLE public.attendance_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attendance visibility" ON public.attendance_visibility FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.public_attending_events(_user_id uuid, lim integer DEFAULT 60)
 RETURNS TABLE(id uuid, title text, starts_at timestamp with time zone, location text, venue_name text, image_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT DISTINCT e.id, e.title, e.starts_at, e.location, e.venue_name, e.image_url
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  LEFT JOIN public.attendance_visibility av ON av.user_id = _user_id AND av.event_id = e.id
  WHERE t.buyer_id = _user_id
    AND t.status = 'paid'
    AND COALESCE(e.is_published, true) = true
    AND (
      auth.uid() = _user_id
      OR COALESCE(av.visibility, 'public') = 'public'
      OR (av.visibility = 'friends' AND auth.uid() IS NOT NULL
          AND EXISTS (SELECT 1 FROM public.follows f1 WHERE f1.follower_id = auth.uid() AND f1.following_id = _user_id)
          AND EXISTS (SELECT 1 FROM public.follows f2 WHERE f2.follower_id = _user_id AND f2.following_id = auth.uid()))
    )
  ORDER BY e.starts_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(lim, 60), 200));
$function$;
GRANT EXECUTE ON FUNCTION public.public_attending_events(uuid, integer) TO anon, authenticated;