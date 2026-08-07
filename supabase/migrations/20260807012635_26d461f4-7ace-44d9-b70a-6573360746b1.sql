CREATE POLICY "Users can delete their own invites" ON public.invites FOR DELETE TO authenticated USING (auth.uid() = invited_by);
GRANT DELETE ON public.invites TO authenticated;