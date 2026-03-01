-- Add scan support to lab_xray_attachments table
-- This migration adds scan_order_id column and updates test_type check constraint

-- Add scan_order_id column
ALTER TABLE lab_xray_attachments 
ADD COLUMN scan_order_id UUID REFERENCES scan_test_orders(id) ON DELETE CASCADE;

-- Update test_type check constraint to include 'scan'
ALTER TABLE lab_xray_attachments 
DROP CONSTRAINT IF EXISTS lab_xray_attachments_test_type_check;

ALTER TABLE lab_xray_attachments 
ADD CONSTRAINT lab_xray_attachments_test_type_check 
CHECK (test_type IN ('lab', 'radiology', 'scan'));

-- Add index for scan_order_id for better query performance
CREATE INDEX idx_lab_xray_attachments_scan_order_id 
ON lab_xray_attachments(scan_order_id) 
WHERE scan_order_id IS NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN lab_xray_attachments.scan_order_id IS 'Reference to scan test order when attachment is for a scan test';
COMMENT ON CONSTRAINT lab_xray_attachments_test_type_check ON lab_xray_attachments IS 'Ensures test_type is one of: lab, radiology, or scan';
