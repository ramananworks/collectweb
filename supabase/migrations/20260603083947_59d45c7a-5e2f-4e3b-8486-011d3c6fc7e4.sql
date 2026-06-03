
-- 1. Fix delivery_otps policies: restrict to authenticated role only
DROP POLICY IF EXISTS "Users can insert company delivery otps" ON public.delivery_otps;
DROP POLICY IF EXISTS "Users can read company delivery otps" ON public.delivery_otps;
DROP POLICY IF EXISTS "Users can update company delivery otps" ON public.delivery_otps;

CREATE POLICY "Users can insert company delivery otps"
ON public.delivery_otps FOR INSERT TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can read company delivery otps"
ON public.delivery_otps FOR SELECT TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company delivery otps"
ON public.delivery_otps FOR UPDATE TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- 2. Fix storage.objects DELETE/UPDATE for bill-images: enforce company ownership
DROP POLICY IF EXISTS "Users can delete bill images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update bill images" ON storage.objects;

CREATE POLICY "Users can delete own company bill images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'bill-images'
  AND ((storage.foldername(name))[1])::uuid = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can update own company bill images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'bill-images'
  AND ((storage.foldername(name))[1])::uuid = get_user_company_id(auth.uid())
);

-- 3. user_roles: add explicit deny policies for INSERT/UPDATE/DELETE to prevent privilege escalation
-- (No policy = deny by default, but make this explicit for clarity and defense-in-depth)
CREATE POLICY "No client inserts on user_roles"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No client updates on user_roles"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated, anon
USING (false);

CREATE POLICY "No client deletes on user_roles"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated, anon
USING (false);

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon and public to limit attack surface.
-- These are used by RLS policies for authenticated users only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
