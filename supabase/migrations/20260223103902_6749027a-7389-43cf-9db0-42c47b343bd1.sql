
-- Update handle_new_user to support invited users (skip company creation if company_id provided in metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id UUID;
  invited_company_id UUID;
  invited_role app_role;
BEGIN
  -- Check if this user was invited (has company_id in metadata)
  invited_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  invited_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'staff');

  IF invited_company_id IS NOT NULL THEN
    -- Invited user: use existing company
    INSERT INTO public.profiles (id, name, email, company_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.email, ''),
      invited_company_id
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invited_role);
  ELSE
    -- New signup: create company
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

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$function$;
