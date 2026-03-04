-- =====================================================
-- PATIENT INTENT USAGE TRACKING
-- Created: March 3, 2026
-- Description: Tracks emergency/operation theater medicines 
--              drawn from intent departments for specific patients.
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_intent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  patient_uhid VARCHAR(50),
  patient_name VARCHAR(255),
  medication_id UUID REFERENCES medications(id),
  intent_medicine_id UUID, -- References intent_medicines(id)
  intent_type VARCHAR(100), -- e.g. 'major ot', 'icu'
  batch_number VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2), -- MRP at the time of usage
  status VARCHAR(20) CHECK (status IN ('pending', 'billed', 'cancelled')) DEFAULT 'pending',
  billing_id UUID REFERENCES billing(id), -- Set after billing is completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_patient_intent_usage_patient ON patient_intent_usage(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_intent_usage_uhid ON patient_intent_usage(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_patient_intent_usage_status ON patient_intent_usage(status);
CREATE INDEX IF NOT EXISTS idx_patient_intent_usage_medication ON patient_intent_usage(medication_id);

-- Enable RLS
ALTER TABLE patient_intent_usage ENABLE ROW LEVEL SECURITY;

-- Permissive policy for authenticated users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'patient_intent_usage' AND policyname = 'Allow all for authenticated users'
  ) THEN
    CREATE POLICY "Allow all for authenticated users" ON patient_intent_usage FOR ALL USING (true);
  END IF;
END $$;

-- Help text: 
-- 1. Intent medicine taken for patient -> INSERT into patient_intent_usage (status='pending')
-- 2. Billing patient -> Fetch 'pending' from patient_intent_usage, add to bill
-- 3. Bill paid -> UPDATE patient_intent_usage (status='billed', billing_id=...) 
--              AND UPDATE intent_medicines (quantity = quantity - used_quantity)
