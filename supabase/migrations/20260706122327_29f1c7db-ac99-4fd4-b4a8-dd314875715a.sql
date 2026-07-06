
CREATE OR REPLACE FUNCTION public.company_has_active_plan(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE company_id = _company_id
      AND status IN ('active','authenticated','pending')
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$function$;

CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_active_sub boolean;
  cur_count int;
BEGIN
  SELECT COUNT(*) INTO cur_count FROM public.user_roles WHERE company_id = NEW.company_id;
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE company_id = NEW.company_id
      AND status IN ('active','authenticated','pending')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO has_active_sub;

  -- Allow the very first user (owner) at signup; block any additional users without an active subscription.
  IF cur_count >= 1 AND NOT has_active_sub THEN
    RAISE EXCEPTION 'An active Pro subscription is required to invite team members.';
  END IF;

  RETURN NEW;
END;
$function$;
