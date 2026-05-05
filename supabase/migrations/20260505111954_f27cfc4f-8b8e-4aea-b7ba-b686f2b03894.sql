INSERT INTO public.user_roles (user_id, role)
SELECT '885cf01c-e270-4864-b835-0017c77ad0a8', 'admin'::public.app_role
ON CONFLICT (user_id, role) DO NOTHING;