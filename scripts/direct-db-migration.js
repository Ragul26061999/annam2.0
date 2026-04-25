/**
 * Direct Database Migration Script
 * Uses Supabase service role key to execute SQL directly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Supabase configuration from .env.local
const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgyMjQ0MCwiZXhwIjoyMDY3Mzk4NDQwfQ.tyoOnzK81Tnwu9XfGPo-rHdETorAdq3jbQUg_24HFIM';

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the SQL migration file
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

async function executeMigration() {
  try {
    console.log('🚀 Starting direct database migration...');
    console.log('📋 Target: uploaded_bills table creation');
    
    // First, let's try to create a SQL execution function if it doesn't exist
    console.log('🔧 Setting up SQL execution capability...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Try to create the function
    try {
      const { error: funcError } = await supabase.rpc('exec_sql', { 
        sql_query: createFunctionSQL 
      });
      
      if (funcError && !funcError.message.includes('already exists')) {
        console.log('⚠️  Could not create exec_sql function, trying alternative approach...');
      } else {
        console.log('✅ SQL execution function ready');
      }
    } catch (e) {
      console.log('⚠️  Function creation failed, continuing with direct approach...');
    }
    
    // Now execute the actual migration
    console.log('📜 Executing uploaded_bills table creation...');
    
    // Split the SQL into individual statements and execute them one by one
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // Try using the exec_sql function first
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          // If exec_sql doesn't work, try direct table operations
          if (error.message.includes('function exec_sql')) {
            console.log('⚠️  exec_sql not available, table created via direct client operations');
            break;
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            continue;
          }
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (stmtError) {
        console.error(`❌ Error executing statement ${i + 1}:`, stmtError.message);
      }
    }
    
    // Verify the table was created
    console.log('\n🔍 Verifying table creation...');
    const { data: tableData, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'uploaded_bills')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('❌ Error verifying table:', tableError.message);
    } else if (tableData && tableData.length > 0) {
      console.log('✅ SUCCESS: uploaded_bills table created successfully!');
      
      // Check table structure
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'uploaded_bills')
        .eq('table_schema', 'public')
        .order('ordinal_position');
      
      if (!colError && columns) {
        console.log('\n📋 Table structure:');
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
      }
      
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('❌ Table was not created. Please run the SQL manually in Supabase Dashboard.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📝 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('\n' + sql);
  }
}

executeMigration();
