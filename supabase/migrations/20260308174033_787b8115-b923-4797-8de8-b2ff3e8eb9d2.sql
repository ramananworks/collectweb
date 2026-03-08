
-- Add new enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'collection_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_staff';
