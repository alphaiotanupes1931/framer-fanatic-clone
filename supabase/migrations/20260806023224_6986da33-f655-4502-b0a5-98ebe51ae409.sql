UPDATE site_content SET value = '"#FFFFFF"'::jsonb WHERE key IN (
  'creators.headline.line1.color',
  'creators.headline.line2.color',
  'creators.card1.title.color',
  'creators.card1.body.color',
  'creators.card1.cta.color',
  'creators.card2.title.color',
  'creators.card2.body.color',
  'creators.card2.cta.color'
);