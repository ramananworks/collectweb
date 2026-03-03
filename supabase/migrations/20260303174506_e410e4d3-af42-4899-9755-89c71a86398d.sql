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
  invited_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  invited_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'staff');

  IF invited_company_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, phone, company_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      invited_company_id
    );

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, invited_role, invited_company_id);
  ELSE
    INSERT INTO public.companies (name, phone)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
      COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    RETURNING id INTO new_company_id;

    INSERT INTO public.profiles (id, name, email, phone, company_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      new_company_id
    );

    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (NEW.id, 'owner', new_company_id);
  END IF;

  RETURN NEW;
END;
$function$;