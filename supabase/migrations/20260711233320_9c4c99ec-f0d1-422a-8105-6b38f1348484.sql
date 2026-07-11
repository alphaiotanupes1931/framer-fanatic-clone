
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS cleared_at_a timestamptz,
  ADD COLUMN IF NOT EXISTS cleared_at_b timestamptz;

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS cleared_at timestamptz;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_for uuid[] NOT NULL DEFAULT '{}';

-- Allow conversation participants to update messages (only deleted_for realistically; app enforces)
DROP POLICY IF EXISTS "members update messages" ON public.messages;
CREATE POLICY "members update messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()))
  WITH CHECK (public.is_conversation_member(conversation_id, auth.uid()));
