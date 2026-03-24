-- Create ip_other_charges table for IP billing other charges
-- This table stores individual charge line items for inpatient billing
-- It is separate from billing_item which has FK constraints to the billing system

CREATE TABLE IF NOT EXISTS ip_other_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  allocation_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  days INTEGER DEFAULT 1,
  rate NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(12,2) DEFAULT 0,
  qty INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups by allocation
CREATE INDEX IF NOT EXISTS idx_ip_other_charges_allocation ON ip_other_charges(allocation_id);

-- Disable RLS so the service role key and anon key can both access
ALTER TABLE ip_other_charges ENABLE ROW LEVEL SECURITY;

-- Allow all operations (service role bypasses RLS, but this allows anon key too)
CREATE POLICY "Allow all operations on ip_other_charges" ON ip_other_charges
  FOR ALL USING (true) WITH CHECK (true);
