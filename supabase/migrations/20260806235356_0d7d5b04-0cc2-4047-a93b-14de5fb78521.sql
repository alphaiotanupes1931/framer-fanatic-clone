ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS orientation text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS aspect_ratio numeric;
DROP POLICY IF EXISTS "Admins can delete any video" ON public.videos;
CREATE POLICY "Admins can delete any video" ON public.videos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));