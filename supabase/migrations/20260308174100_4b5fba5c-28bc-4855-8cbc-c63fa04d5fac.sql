
-- Add delivery confirmation columns to invoices
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS delivered_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS otp_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_location jsonb;

-- Create delivery OTPs table
CREATE TABLE IF NOT EXISTS public.delivery_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id)
);

ALTER TABLE public.delivery_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read company delivery otps"
  ON public.delivery_otps FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company delivery otps"
  ON public.delivery_otps FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company delivery otps"
  ON public.delivery_otps FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));
