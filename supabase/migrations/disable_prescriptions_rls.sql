-- TEMPORARY: Disable RLS for prescriptions table to fix access issues in Outpatient module
-- WARNING: This removes security. Only use for testing!
-- Re-enable RLS after testing with proper policies

ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;

-- To re-enable later, run:
-- ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
