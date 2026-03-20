-- Migration: Drop restrictive check constraints on other_bills
-- Date: 2026-03-19

-- 1. Drop the charge_category check constraint from other_bills
ALTER TABLE IF EXISTS other_bills 
DROP CONSTRAINT IF EXISTS other_bills_charge_category_check;

-- 2. Drop the patient_type check constraint from other_bills (if any)
ALTER TABLE IF EXISTS other_bills 
DROP CONSTRAINT IF EXISTS other_bills_patient_type_check;

-- 3. Drop the charge_category check constraint from other_bill_items
ALTER TABLE IF EXISTS other_bill_items
DROP CONSTRAINT IF EXISTS other_bill_items_charge_category_check;

-- 4. Ensure charge_category column is TEXT/VARCHAR in both tables (not ENUM or restricted)
ALTER TABLE IF EXISTS other_bills 
ALTER COLUMN charge_category TYPE VARCHAR(100);

ALTER TABLE IF EXISTS other_bill_items 
ALTER COLUMN charge_category TYPE VARCHAR(100);

-- 5. Verify other_bill_charge_categories table exists and has necessary columns
CREATE TABLE IF NOT EXISTS other_bill_charge_categories (
    value VARCHAR(100) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Seed initial categories if not present
INSERT INTO other_bill_charge_categories (value, label, description, sort_order)
VALUES 
    ('nursing_charges', 'Nursing Charges', 'Nursing care and monitoring fees', 1),
    ('attendant_charges', 'Attendant Charges', 'Patient attendant service fees', 2),
    ('medical_equipment', 'Medical Equipment', 'Equipment rental or usage charges', 3),
    ('ambulance_service', 'Ambulance Service', 'Ambulance transportation charges', 4),
    ('special_procedures', 'Special Procedures', 'Special medical procedure charges', 5),
    ('dietary_charges', 'Dietary Charges', 'Special diet and meal charges', 6),
    ('laundry_service', 'Laundry Service', 'Linen and laundry charges', 7),
    ('accommodation_extra', 'Extra Accommodation', 'Additional room/bed charges', 8),
    ('mortuary_charges', 'Mortuary Charges', 'Mortuary and preservation charges', 9),
    ('certificate_charges', 'Certificate Fees', 'Medical certificate and report fees', 10),
    ('photocopying', 'Photocopying', 'Document photocopying charges', 11),
    ('misc_supplies', 'Miscellaneous Supplies', 'Other medical supplies', 12),
    ('other', 'Other', 'Other miscellaneous charges', 13)
ON CONFLICT (value) DO NOTHING;

