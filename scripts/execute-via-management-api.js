/**
 * Execute SQL via Supabase Management API
 * This script uses the management API to execute SQL directly
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

// Extract project reference from URL
const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!urlMatch) {
  console.error('❌ Error: Invalid Supabase URL format');
  process.exit(1);
}

const projectRef = urlMatch[1];

// Read the SQL migration file
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

async function executeSQL() {
  try {
    console.log('🚀 Executing SQL via Management API...');
    console.log(`📝 Project: ${projectRef}`);
    
    // Use the Supabase Management API endpoint for SQL execution
    const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    
    console.log('🔗 Management API URL:', managementUrl);
    
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: sql
      })
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
      
      // Try alternative endpoint
      console.log('\n🔄 Trying alternative SQL execution method...');
      const alternativeUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/queries`;
      
      const altResponse = await fetch(alternativeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql
        })
      });
      
      console.log('📊 Alternative response status:', altResponse.status);
      
      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.log('❌ Alternative API Error:', altErrorText);
      } else {
        console.log('✅ SQL executed via alternative method!');
      }
    } else {
      const result = await response.json();
      console.log('✅ SQL executed successfully!');
      console.log('📊 Result:', result);
    }

    // Verify table creation
    console.log('\n🔍 Verifying table creation...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabase
      .from('uploaded_bills')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ Table verification failed:', error.message);
    } else {
      console.log('✅ Table "uploaded_bills" created successfully!');
      console.log('🎯 Upload functionality is now ready!');
    }

  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
  }
}

executeSQL();
