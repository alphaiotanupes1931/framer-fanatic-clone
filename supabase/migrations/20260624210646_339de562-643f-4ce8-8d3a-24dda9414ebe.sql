
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_read_at_a timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_read_at_b timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_message_preview text;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
