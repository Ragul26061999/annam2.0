import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    const supabase = requireSupabaseAdmin();

    // Use rpc to execute raw SQL
    // Note: This requires a SQL function to be created first
    // For now, we'll return an error message with instructions
    return NextResponse.json(
      { 
        error: 'Direct SQL execution through client is not supported',
        message: 'Please use the Supabase Dashboard SQL Editor or add DATABASE_URL to .env.local and use the apply-migration.js script',
        sql: sql
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error executing SQL:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
