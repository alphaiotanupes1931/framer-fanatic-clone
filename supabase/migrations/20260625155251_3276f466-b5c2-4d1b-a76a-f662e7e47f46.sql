
-- RLS for event-images storage
CREATE POLICY "event-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "event-images authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "event-images owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND owner = auth.uid());

CREATE POLICY "event-images owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND owner = auth.uid());
