
-- 1. Add company_id column to user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 2. Backfill company_id from profiles
UPDATE public.user_roles ur
SET company_id = p.company_id
FROM public.profiles p
WHERE ur.user_id = p.id;

-- 3. Make it NOT NULL after backfill
ALTER TABLE public.user_roles
  ALTER COLUMN company_id SET NOT NULL;

-- 4. Drop old RLS policies
DROP POLICY IF EXISTS "Users can read company roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

-- 5. Create new company-scoped RLS policies
CREATE POLICY "Users can read company roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- 6. Update handle_new_user trigger to include company_id in user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  new_company_id UUID;
  invited_company_id UUID;
  invited_role app_role;
BEGIN
  invited_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  invited_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'staff');

  IF invited_company_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, company_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.email, ''),
      invited_company_id
    );

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, invited_role, invited_company_id);
  ELSE
    INSERT INTO public.companies (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'))
    RETURNING id INTO new_company_id;

    INSERT INTO public.profiles (id, name, email, company_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.email, ''),
      new_company_id
    );

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, 'owner', new_company_id);
  END IF;

  RETURN NEW;
END;
$$;
