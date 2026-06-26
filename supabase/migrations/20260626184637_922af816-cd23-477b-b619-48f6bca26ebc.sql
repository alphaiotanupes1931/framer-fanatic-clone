UPDATE public.profiles
SET category = NULL
WHERE category IS NOT NULL
  AND lower(trim(category)) NOT IN (
    'musician','podcaster','visual artist','photographer','videographer',
    'filmmaker','fashion designer','graphic designer','writer','poet',
    'dancer','dj','producer','comedian','chef / culinary','tattoo artist',
    'muralist','curator','event organizer','artist','attendee'
  );