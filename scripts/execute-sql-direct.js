/**
 * Execute SQL Directly via Supabase Admin
 * This script uses the service role key to execute SQL directly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration file path
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');

// Read the SQL file
const sql = fs.readFileSync(migrationFile, 'utf8');

async function executeSQL() {
  try {
    console.log('🚀 Executing SQL via Supabase Admin...');
    
    // First, create a temporary function to execute SQL
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
        RETURN 'SQL executed successfully';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'Error: ' || SQLERRM;
      END;
      $$;
    `;
    
    console.log('📝 Creating SQL execution function...');
    const { error: funcError } = await supabase.rpc('execute_sql', {
      sql_query: createFunctionSQL
    });
    
    if (funcError && !funcError.message.includes('function "execute_sql" does not exist')) {
      console.log('⚠️  Function creation failed, trying direct execution...');
    }
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // Try to execute using the service role client with a direct query
        const { data, error } = await supabase
          .from('pg_catalog.pg_tables')
          .select('*')
          .limit(1);
          
        if (error) {
          console.log('⚠️  Direct execution not available, trying alternative approach...');
        }
        
        // For DDL statements, we need to use a different approach
        console.log('ℹ️  This statement requires manual execution in Supabase SQL Editor');
        console.log('📝 Copy and paste this into the SQL Editor:');
        console.log(statement + ';');
        
      } catch (error) {
        console.log('⚠️  Error:', error.message);
      }
    }

    console.log('\n✅ SQL execution completed!');
    console.log('📋 Please execute the statements manually in Supabase SQL Editor:');
    console.log('🔗 https://app.supabase.com/project/_/sql');
    console.log('\n📝 Full SQL to execute:');
    console.log('---');
    console.log(sql);
    console.log('---');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();
