
-- Tighten delivery_otps UPDATE to owners/managers only.
-- The delivery-otp edge function uses the service role and bypasses RLS, so OTP verification still works.
DROP POLICY IF EXISTS "Authorized roles can update company delivery otps" ON public.delivery_otps;
CREATE POLICY "Owners and managers can update company delivery otps"
ON public.delivery_otps
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Tighten storage bill-images DELETE/UPDATE to owners/managers only.
DROP POLICY IF EXISTS "Users can delete own company bill images" ON storage.objects;
CREATE POLICY "Owners and managers can delete company bill images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bill-images'
  AND ((storage.foldername(name))[1])::uuid = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

DROP POLICY IF EXISTS "Users can update own company bill images" ON storage.objects;
CREATE POLICY "Owners and managers can update company bill images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'bill-images'
  AND ((storage.foldername(name))[1])::uuid = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);
