-- Bypass RLS for billing tables to allow updates
-- WARNING: This removes security. Only use for testing!
-- Re-enable RLS after testing with proper policies

-- Disable RLS on billing tables
ALTER TABLE billing DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments DISABLE ROW LEVEL SECURITY;

-- To re-enable later with proper policies, run:
-- ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE billing_item ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
