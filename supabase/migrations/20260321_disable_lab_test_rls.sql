-- Disable RLS on lab test order tables to allow updates from outpatient page
-- WARNING: This removes security. Only use for testing!
-- Re-enable RLS after testing with proper policies

ALTER TABLE lab_test_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE radiology_test_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE scan_test_orders DISABLE ROW LEVEL SECURITY;

-- To re-enable later with proper policies, run:
-- ALTER TABLE lab_test_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE radiology_test_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scan_test_orders ENABLE ROW LEVEL SECURITY;
