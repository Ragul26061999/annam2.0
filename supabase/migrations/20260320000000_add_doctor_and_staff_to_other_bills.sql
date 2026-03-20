-- Migration: Add doctor and staff fields to other_bills
-- Date: 2026-03-20

-- 1. Add doctor_id column to other_bills (referencing doctors)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'other_bills' AND column_name = 'doctor_id') THEN
        ALTER TABLE other_bills ADD COLUMN doctor_id UUID REFERENCES doctors(id);
    END IF;
END $$;

-- 2. Add doctor_name column to other_bills
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'other_bills' AND column_name = 'doctor_name') THEN
        ALTER TABLE other_bills ADD COLUMN doctor_name TEXT;
    END IF;
END $$;

-- 3. Add staff_id column to other_bills (referencing staff)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'other_bills' AND column_name = 'staff_id') THEN
        ALTER TABLE other_bills ADD COLUMN staff_id UUID REFERENCES staff(id);
    END IF;
END $$;

-- 4. Add staff_name column to other_bills
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'other_bills' AND column_name = 'staff_name') THEN
        ALTER TABLE other_bills ADD COLUMN staff_name TEXT;
    END IF;
END $$;
