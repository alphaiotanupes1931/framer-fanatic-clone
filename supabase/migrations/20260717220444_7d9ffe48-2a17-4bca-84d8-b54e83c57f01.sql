INSERT INTO site_content (key, value) VALUES
  ('hero.line1', to_json('Baltimore'::text)),
  ('hero.line2', to_json('in One Place'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;