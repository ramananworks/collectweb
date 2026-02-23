
ALTER TABLE public.companies
ADD COLUMN address text NOT NULL DEFAULT '',
ADD COLUMN gstin text DEFAULT NULL,
ADD COLUMN phone text NOT NULL DEFAULT '';
