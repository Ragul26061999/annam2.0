-- Add registration_type column to bed_allocations table
ALTER TABLE IF EXISTS public.bed_allocations 
ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'admission';

-- Update existing records to 'admission' if any
UPDATE public.bed_allocations SET registration_type = 'admission' WHERE registration_type IS NULL;
