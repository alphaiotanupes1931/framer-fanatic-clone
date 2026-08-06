INSERT INTO site_content (key, value) VALUES
  ('features.heading.color', '"#FFFFFF"'),
  ('features.subtitle.color', '"#FFFFFF"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;