DROP POLICY IF EXISTS "convo participants view" ON public.conversations;
CREATE POLICY "convo participants view" ON public.conversations
FOR SELECT
USING (
  auth.uid() = user_a
  OR auth.uid() = user_b
  OR auth.uid() = created_by
  OR public.is_conversation_member(id, auth.uid())
);