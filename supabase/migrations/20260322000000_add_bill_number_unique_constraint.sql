-- Migration: Add unique constraint to billing.bill_number to prevent duplicate bill numbers
-- This fixes the race condition where concurrent bill creation could generate duplicate bill numbers

-- First, check for and handle any existing duplicate bill numbers
-- This query will show any duplicates that need to be resolved manually before applying the constraint
/*
SELECT bill_number, COUNT(*) as count, array_agg(id) as bill_ids
FROM billing
GROUP BY bill_number
HAVING COUNT(*) > 1;
*/

-- Add unique constraint on bill_number
-- Note: If there are existing duplicates, this will fail. Run the cleanup query first.
ALTER TABLE billing
ADD CONSTRAINT billing_bill_number_unique UNIQUE (bill_number);

-- Create an index on bill_number for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_billing_bill_number ON billing(bill_number);

-- Add comment documenting the constraint
COMMENT ON CONSTRAINT billing_bill_number_unique ON billing 
IS 'Ensures bill numbers are unique across all bills to prevent data inconsistencies from race conditions';
