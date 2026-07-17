UPDATE public.site_content SET value = to_jsonb('Baltimore is'::text) WHERE key = 'hero.line1';
UPDATE public.site_content SET value = to_jsonb('extraordinary'::text) WHERE key = 'hero.line2';