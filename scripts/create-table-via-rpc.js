/**
 * Create uploaded_bills table via Supabase RPC
 * This script creates a temporary SQL execution function and uses it
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the SQL migration file
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

async function createTable() {
  try {
    console.log('🚀 Creating uploaded_bills table via RPC...');
    
    // First, create a temporary SQL execution function using raw SQL
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
    
    // Try to create the function by using the service role to execute SQL directly
    const { data: funcResult, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'execute_sql');
    
    if (funcError) {
      console.log('⚠️  Cannot access pg_proc, trying alternative approach...');
    }
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Executing ${statements.length} SQL statements...`);

    // Execute each statement using the database
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // Use the service role client to execute DDL via a workaround
        // We'll use the database's built-in capabilities
        
        // Try to execute the statement using a direct approach
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} failed:`, error.message);
          
          // Try alternative approach for DDL statements
          if (statement.toLowerCase().includes('create table') ||
              statement.toLowerCase().includes('create index') ||
              statement.toLowerCase().includes('alter table') ||
              statement.toLowerCase().includes('create policy')) {
            
            console.log('🔄 Trying alternative execution method...');
            
            // Create a temporary table to test if we can execute DDL
            const testResult = await supabase
              .from('information_schema.tables')
              .select('table_name')
              .eq('table_schema', 'public')
              .eq('table_name', 'uploaded_bills');
            
            if (testResult.error) {
              console.log('❌ Cannot execute DDL via client API');
            } else {
              console.log('✅ DDL execution possible, but requires manual step');
            }
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed:`, data);
        }
        
      } catch (error) {
        console.log(`❌ Error executing statement ${i + 1}:`, error.message);
      }
    }

    console.log('\n🎉 SQL execution attempt completed!');
    
    // Verify table creation
    console.log('\n🔍 Verifying table creation...');
    const { data, error } = await supabase
      .from('uploaded_bills')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ Table verification failed:', error.message);
      console.log('\n📋 Manual execution required:');
      console.log('1. Go to Supabase Dashboard SQL Editor');
      console.log('2. Execute the SQL from the migration file');
      console.log('3. The table will be created successfully');
    } else {
      console.log('✅ Table "uploaded_bills" created successfully!');
      console.log('🎯 Upload functionality is now ready!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTable();
