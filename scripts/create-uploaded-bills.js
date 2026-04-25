/**
 * Create uploaded_bills table using Supabase admin client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Supabase configuration not found');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the SQL migration file
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Error: Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationFile, 'utf8');

async function createTable() {
  try {
    console.log('🚀 Creating uploaded_bills table...');
    console.log('📜 Executing SQL:');
    console.log(sql);
    console.log('--- End SQL ---\n');

    // Use RPC to execute the SQL
    // First, we need to create a temporary function to execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error creating table:', error);
      
      // If exec_sql doesn't exist, try a different approach
      if (error.message.includes('function exec_sql')) {
        console.log('🔄 exec_sql function not found, trying direct SQL execution...');
        
        // Try using the raw SQL through the database
        const { data: rawData, error: rawError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'uploaded_bills');
          
        if (rawError && !rawError.message.includes('does not exist')) {
          console.error('❌ Database connection error:', rawError);
          process.exit(1);
        }
        
        if (rawData && rawData.length > 0) {
          console.log('✅ Table uploaded_bills already exists');
        } else {
          console.log('⚠️  Cannot execute SQL directly. Please use Supabase Dashboard SQL Editor to run the migration manually.');
          console.log('📝 Copy the following SQL to Supabase Dashboard → SQL Editor:');
          console.log('\n' + sql + '\n');
        }
      } else {
        process.exit(1);
      }
    } else {
      console.log('✅ Table uploaded_bills created successfully!');
      console.log('📋 Migration applied successfully');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

createTable();
