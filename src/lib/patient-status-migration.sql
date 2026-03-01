-- Migration to add patient status fields
-- Run this SQL in your Supabase SQL Editor to add the new fields

-- Add is_admitted and is_critical boolean fields to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS is_admitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE;

-- Update existing patients based on current logic
-- Set is_critical for emergency patients with active status
UPDATE patients 
SET is_critical = TRUE 
WHERE admission_type = 'emergency' AND status = 'active';

-- Set is_admitted for patients who have bed allocations
UPDATE patients 
SET is_admitted = TRUE 
WHERE id IN (
    SELECT DISTINCT patient_id 
    FROM bed_allocations 
    WHERE status = 'active' AND discharge_date IS NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_is_admitted ON patients(is_admitted);
CREATE INDEX IF NOT EXISTS idx_patients_is_critical ON patients(is_critical);

-- Add comments for documentation
COMMENT ON COLUMN patients.is_admitted IS 'Indicates if the patient is currently admitted to the hospital';
COMMENT ON COLUMN patients.is_critical IS 'Indicates if the patient is in critical condition';