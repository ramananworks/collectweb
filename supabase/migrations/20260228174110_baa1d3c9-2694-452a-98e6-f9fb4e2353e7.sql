
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS local_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS synced boolean NOT NULL DEFAULT true;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS local_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS synced boolean NOT NULL DEFAULT true;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS local_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS synced boolean NOT NULL DEFAULT true;
