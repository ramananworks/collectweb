ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;