ALTER FUNCTION public.move_to_dlq(text,text,bigint,jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text,integer,integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text,jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email_delayed(text,jsonb,integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text,bigint) SET search_path = public, pgmq;

DROP POLICY IF EXISTS "anyone can send inquiries" ON public.artist_inquiries;
CREATE POLICY "anyone can send inquiries" ON public.artist_inquiries FOR INSERT TO anon, authenticated
WITH CHECK (
  (sender_id IS NULL OR sender_id = auth.uid())
  AND (auth.uid() IS NULL OR sender_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = artist_id)
  AND length(btrim(sender_name)) BETWEEN 1 AND 200
  AND length(btrim(sender_email)) BETWEEN 3 AND 320
  AND sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(btrim(message)) BETWEEN 1 AND 5000
  AND length(intent) <= 100
);

DROP POLICY IF EXISTS "video likes readable" ON public.video_likes;
CREATE POLICY "video likes readable" ON public.video_likes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_likes.video_id));