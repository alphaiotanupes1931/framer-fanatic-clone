insert into public.site_content (key, value) values
  ('hero.line1.color', to_jsonb('#FFFFFF'::text)),
  ('hero.line2.color', to_jsonb('#FFFFFF'::text)),
  ('creators.headline.line1.color', to_jsonb('#E0C4A0'::text)),
  ('creators.headline.line2.color', to_jsonb('#E0C4A0'::text)),
  ('creators.card1.title.color', to_jsonb('#d64713'::text)),
  ('creators.card1.body.color', to_jsonb('#d64713'::text)),
  ('creators.card1.cta.color', to_jsonb('#d64713'::text)),
  ('creators.card2.title.color', to_jsonb('#d64713'::text)),
  ('creators.card2.body.color', to_jsonb('#d64713'::text)),
  ('creators.card2.cta.color', to_jsonb('#d64713'::text))
on conflict (key) do update set value = excluded.value;