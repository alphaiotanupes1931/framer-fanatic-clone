CREATE TABLE public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_key text NOT NULL,
  reward_name text NOT NULL,
  points_spent integer NOT NULL DEFAULT 0,
  contact_note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reward claims"
ON public.referral_rewards FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own reward claims"
ON public.referral_rewards FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update reward claims"
ON public.referral_rewards FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_referral_rewards_updated_at
BEFORE UPDATE ON public.referral_rewards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();