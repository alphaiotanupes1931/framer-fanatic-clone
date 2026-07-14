
CREATE POLICY "Anyone can view podcast media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'podcast-media');

CREATE POLICY "Users upload their own podcast media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'podcast-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own podcast media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'podcast-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own podcast media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'podcast-media' AND auth.uid()::text = (storage.foldername(name))[1]);
