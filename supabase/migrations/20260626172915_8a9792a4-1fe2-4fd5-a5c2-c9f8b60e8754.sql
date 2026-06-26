ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET is_founder = true
  WHERE id IN ('8cd22806-a3ea-4892-bd2b-d54c4bcfebb3','d0baf11e-7023-4190-8547-7a04fc085a04');