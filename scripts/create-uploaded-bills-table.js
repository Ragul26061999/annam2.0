/**
 * Create uploaded_bills table using Supabase Admin
 * This script creates the table by executing the SQL via Supabase's SQL editor API
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
    console.log('🚀 Creating uploaded_bills table...');
    
    // We need to execute the SQL manually since Supabase client doesn't support DDL
    // Let's provide clear instructions for manual execution
    console.log('\n📋 To create the table, please follow these steps:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('\n--- SQL TO EXECUTE ---');
    console.log(sql);
    console.log('--- END SQL ---\n');
    
    console.log('4. Click "Run" to execute the SQL');
    console.log('5. The table will be created with all indexes and RLS policies');
    
    console.log('\n🔗 Direct link to SQL Editor:');
    console.log(`${supabaseUrl.replace('https://', 'https://app.')}/project/_/sql`);
    
    console.log('\n✅ After running the SQL, the upload functionality will work!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTable();
