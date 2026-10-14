ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;
CREATE POLICY "post-media chat members read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[2] = 'chat'
  AND (storage.foldername(name))[3] ~ '^[0-9a-f-]{36}$'
  AND public.is_conversation_member(((storage.foldername(name))[3])::uuid, auth.uid())
);