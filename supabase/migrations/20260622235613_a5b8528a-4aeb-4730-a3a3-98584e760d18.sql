
UPDATE public.neighborhoods SET latitude=lat, longitude=lng FROM (VALUES
('Abell',39.3253,-76.6155),('Allendale',39.3022,-76.6757),('Arcadia',39.3608,-76.5704),
('Arlington',39.3520,-76.6747),('Armistead Gardens',39.3146,-76.5635),('Ashburton',39.3236,-76.6709),
('Barclay',39.3145,-76.6125),('Belair-Edison',39.3287,-76.5777),('Bolton Hill',39.3074,-76.6230),
('Brooklyn',39.2400,-76.6020),('Canton',39.2829,-76.5749),('Charles Village',39.3219,-76.6157),
('Cherry Hill',39.2540,-76.6253),('Curtis Bay',39.2333,-76.5821),('Druid Heights',39.3110,-76.6420),
('Federal Hill',39.2780,-76.6080),('Fells Point',39.2820,-76.5928),('Hampden',39.3299,-76.6357),
('Harbor East',39.2820,-76.6020),('Highlandtown',39.2870,-76.5722),('Inner Harbor',39.2855,-76.6105),
('Locust Point',39.2697,-76.5870),('Mount Vernon',39.2980,-76.6155),('Mount Washington',39.3686,-76.6478),
('Old Goucher',39.3179,-76.6164),('Patterson Park',39.2887,-76.5774),('Pigtown',39.2829,-76.6357),
('Remington',39.3221,-76.6260),('Roland Park',39.3520,-76.6356),('Station North',39.3105,-76.6157),
('Upton',39.3040,-76.6357),('Waverly',39.3340,-76.6080),('Woodberry',39.3380,-76.6420)
) AS v(name,lat,lng) WHERE neighborhoods.name=v.name;
