
DROP POLICY IF EXISTS "post-media read" ON storage.objects;
CREATE POLICY "post-media read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'post-media');
DROP POLICY IF EXISTS "post-media insert own" ON storage.objects;
CREATE POLICY "post-media insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "post-media delete own" ON storage.objects;
CREATE POLICY "post-media delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
