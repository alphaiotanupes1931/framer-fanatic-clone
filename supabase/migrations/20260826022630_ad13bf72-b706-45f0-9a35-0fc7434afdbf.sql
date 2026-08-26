CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_pair_key
ON public.conversations (LEAST(user_a, user_b), GREATEST(user_a, user_b))
WHERE is_group = false AND user_a IS NOT NULL AND user_b IS NOT NULL;