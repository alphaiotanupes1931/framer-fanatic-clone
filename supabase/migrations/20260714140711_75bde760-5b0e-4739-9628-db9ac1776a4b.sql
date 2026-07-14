UPDATE public.profiles SET role = 'resident' WHERE role = 'attendee';
UPDATE public.user_roles SET role = 'resident' WHERE role = 'attendee';