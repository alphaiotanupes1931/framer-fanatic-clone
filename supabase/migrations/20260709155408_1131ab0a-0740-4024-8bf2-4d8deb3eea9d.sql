
UPDATE public.profiles SET category='visual art', neighborhood='Harwood' WHERE lower(display_name)='ainsley burrows';

DO $$
DECLARE
  new_id uuid;
  seed_rows CONSTANT text[][] := ARRAY[
    ARRAY['RDG','music','Abell'],
    ARRAY['Jada Davis | On Repeat Podcast','podcaster','Baltimore Peninsula'],
    ARRAY['Ada Pinkston','mixed media','Waverly'],
    ARRAY['Young Vader','podcaster','Barclay'],
    ARRAY['Reginald ''RVP'' Vance-Pierce','performance','Sandtown-Winchester'],
    ARRAY['Devonte Holloway','digital','Station North'],
    ARRAY['DeShawn Morrow','music','Oliver'],
    ARRAY['Club Voltage','music','Mount Vernon'],
    ARRAY['Priya Bhattacharya','photography','Belair-Edison'],
    ARRAY['Radio Mars','fashion','Barclay'],
    ARRAY['HARLEM & VINE','fashion','Upton'],
    ARRAY['Nadia Okafor','visual art','Station North'],
    ARRAY['Terrell Speaks','literary','Sandtown-Winchester'],
    ARRAY['Khalil Thompson','visual art','Station North'],
    ARRAY['Sofia Greco','performance','Bolton Hill'],
    ARRAY['Elijah Park','video','Charles Village'],
    ARRAY['Nadia Okonkwo','literary','Highlandtown']
  ];
  r text[];
  uname text;
  email text;
BEGIN
  FOREACH r SLICE 1 IN ARRAY seed_rows LOOP
    uname := public.generate_unique_username(r[1], NULL);
    email := uname || '@seed.planetbaltimore.local';

    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(public.titlecase_name(r[1]))) THEN
      CONTINUE;
    END IF;

    new_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
    ) VALUES (
      new_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated','authenticated',
      email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"seed","providers":["seed"]}'::jsonb,
      jsonb_build_object('display_name', r[1], 'role','artist'),
      false, false
    );

    INSERT INTO public.profiles (id, email, display_name, username, role, category, neighborhood, in_baltimore, is_baltimore_verified)
    VALUES (new_id, email, r[1], uname, 'artist', r[2], r[3], true, true)
    ON CONFLICT (id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          username = EXCLUDED.username,
          role = 'artist',
          category = EXCLUDED.category,
          neighborhood = EXCLUDED.neighborhood,
          in_baltimore = true,
          is_baltimore_verified = true;

    INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'artist')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
