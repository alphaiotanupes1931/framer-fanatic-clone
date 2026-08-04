ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_format_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_format_check CHECK (format = ANY (ARRAY[
  'blog','essay','poetry','resource','review','interview','short story',
  'novel','novella','play','screenplay','memoir','flash fiction','spoken word','journal'
]));