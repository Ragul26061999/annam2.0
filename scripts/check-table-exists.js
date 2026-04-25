/**
 * Check if uploaded_bills table exists
 */

const { createClient } = require('@supabase/supabase-js');
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

async function checkTable() {
  try {
    console.log('🔍 Checking if uploaded_bills table exists...');
    
    // Try to query the table
    const { data, error } = await supabase
      .from('uploaded_bills')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Table does not exist or error accessing it:');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      
      if (error.code === '42P01') {
        console.log('\n🔧 Table "uploaded_bills" does not exist. Need to create it.');
        console.log('📝 Please run the migration script to create the table.');
      }
      
      return false;
    }
    
    console.log('✅ Table "uploaded_bills" exists!');
    console.log('📊 Sample data:', data);
    return true;
    
  } catch (error) {
    console.error('❌ Error checking table:', error.message);
    return false;
  }
}

checkTable();
