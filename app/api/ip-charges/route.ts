import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// GET: Load saved charges for a bed allocation
export async function GET(req: NextRequest) {
  const allocationId = req.nextUrl.searchParams.get('allocation_id');
  if (!allocationId) {
    return NextResponse.json({ error: 'allocation_id required' }, { status: 400 });
  }

  const supabase = getAdmin();

  // Try to read from ip_other_charges table
  const { data, error } = await supabase
    .from('ip_other_charges')
    .select('*')
    .eq('allocation_id', allocationId)
    .order('created_at', { ascending: true });

  if (error) {
    // Table might not exist yet
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return NextResponse.json({ charges: [], table_missing: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const charges = (data || []).map((row: any) => ({
    id: row.id,
    service_name: row.service_name,
    days: row.days,
    rate: row.rate,
    amount: row.amount,
    quantity: row.qty || row.days || 1,
  }));

  return NextResponse.json({ charges });
}

// POST: Save charges for a bed allocation
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { allocation_id, charges } = body;

  if (!allocation_id || !Array.isArray(charges)) {
    return NextResponse.json({ error: 'allocation_id and charges[] required' }, { status: 400 });
  }

  const supabase = getAdmin();

  // Ensure table exists - try insert, if table missing, create it
  let tableReady = false;

  // Test if table exists
  const { error: testError } = await supabase
    .from('ip_other_charges')
    .select('id')
    .limit(1);

  if (testError && (testError.message.includes('does not exist') || testError.code === '42P01')) {
    // Table doesn't exist, create it via the SQL endpoint
    // Unfortunately PostgREST can't create tables.
    // Return an error with the SQL to run
    return NextResponse.json({
      error: 'table_missing',
      message: 'Table ip_other_charges does not exist. Please create it.',
      sql: `CREATE TABLE IF NOT EXISTS ip_other_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  allocation_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  days INTEGER DEFAULT 1,
  rate NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(12,2) DEFAULT 0,
  qty INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ip_other_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON ip_other_charges FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_ip_other_charges_allocation ON ip_other_charges(allocation_id);`
    }, { status: 500 });
  }

  if (!testError) tableReady = true;

  if (tableReady) {
    // Delete existing charges for this allocation
    await supabase
      .from('ip_other_charges')
      .delete()
      .eq('allocation_id', allocation_id);

    // Insert new charges
    if (charges.length > 0) {
      const rows = charges.map((c: any) => ({
        allocation_id,
        service_name: c.service_name,
        days: c.days || c.quantity || 1,
        rate: c.rate || 0,
        amount: c.amount || 0,
        qty: c.days || c.quantity || 1,
      }));

      const { error: insertError } = await supabase
        .from('ip_other_charges')
        .insert(rows);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ status: 'ok', saved: charges.length });
  }

  return NextResponse.json({ error: 'Could not verify table' }, { status: 500 });
}
