
CREATE INDEX IF NOT EXISTS stories_status_created_idx ON public.stories (status, created_at DESC);
CREATE INDEX IF NOT EXISTS stories_user_created_idx ON public.stories (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_created_idx ON public.messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON public.conversations (user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON public.conversations (user_b, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON public.conversation_members (user_id);
CREATE INDEX IF NOT EXISTS events_published_status_starts_idx ON public.events (is_published, status, starts_at);
CREATE INDEX IF NOT EXISTS events_user_created_idx ON public.events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_created_idx ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS organizations_type_created_idx ON public.organizations (type, created_at DESC);
