import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  // Extract project ref from URL (e.g., "zusheijhebsmjiyyeiqq" from "https://zusheijhebsmjiyyeiqq.supabase.co")
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

  try {
    // Use Supabase's pg-meta endpoint to run DDL
    const sqlQuery = `ALTER TABLE discharge_summaries ADD COLUMN IF NOT EXISTS other_charges_json JSONB DEFAULT '[]'::jsonb;`;

    const response = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'X-Connection-Encrypted': 'true',
      },
      body: JSON.stringify({ query: sqlQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Fallback: Try via pg-meta REST endpoint
      const pgMetaResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ sql: sqlQuery }),
      });

      if (!pgMetaResponse.ok) {
        return NextResponse.json({ 
          status: 'manual_required',
          message: 'Auto-migration not available. Please run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/' + projectRef + '/sql/new):',
          sql: sqlQuery,
          error: errorText
        });
      }

      return NextResponse.json({ status: 'ok', message: 'Column added via pg-meta' });
    }

    const result = await response.json();
    return NextResponse.json({ status: 'ok', message: 'Column added successfully', result });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message,
      sql: "ALTER TABLE discharge_summaries ADD COLUMN IF NOT EXISTS other_charges_json JSONB DEFAULT '[]'::jsonb;"
    }, { status: 500 });
  }
}
