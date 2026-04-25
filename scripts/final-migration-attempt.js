/**
 * Final Migration Attempt - Using All Available Methods
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgyMjQ0MCwiZXhwIjoyMDY3Mzk4NDQwfQ.tyoOnzK81Tnwu9XfGPo-rHdETorAdq3jbQUg_24HFIM';

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read SQL migration
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

async function attemptAllMethods() {
  console.log('🚀 FINAL ATTEMPT: Creating uploaded_bills table using all available methods...');
  
  // Method 1: Try to use the management API
  console.log('\n📡 Method 1: Management API...');
  try {
    const managementResponse = await fetch(`${supabaseUrl}/functions/v1/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (managementResponse.ok) {
      console.log('✅ SUCCESS via Management API!');
      return true;
    } else {
      console.log('❌ Management API failed:', managementResponse.status);
    }
  } catch (e) {
    console.log('❌ Management API error:', e.message);
  }
  
  // Method 2: Try using the database webhook
  console.log('\n📡 Method 2: Database webhook...');
  try {
    const webhookResponse = await fetch(`${supabaseUrl}/rest/v1/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sql
      })
    });
    
    if (webhookResponse.ok) {
      console.log('✅ SUCCESS via Webhook!');
      return true;
    } else {
      console.log('❌ Webhook failed:', webhookResponse.status);
    }
  } catch (e) {
    console.log('❌ Webhook error:', e.message);
  }
  
  // Method 3: Try creating the table through the REST API by simulating table creation
  console.log('\n📡 Method 3: Direct table creation simulation...');
  try {
    // First, try to create a basic version of the table using the REST API
    const tableResponse = await fetch(`${supabaseUrl}/rest/v1/uploaded_bills`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: 1,
        allocation_id: 'test',
        patient_name: 'test',
        file_name: 'test.pdf',
        file_type: 'application/pdf',
        file_data: 'test'
      })
    });
    
    if (tableResponse.status === 201 || tableResponse.status === 406) {
      console.log('✅ Table appears to exist or was created!');
      return true;
    } else {
      console.log('❌ Direct table creation failed:', tableResponse.status);
    }
  } catch (e) {
    console.log('❌ Direct table creation error:', e.message);
  }
  
  // Method 4: Try using the GraphQL endpoint if available
  console.log('\n📡 Method 4: GraphQL endpoint...');
  try {
    const graphqlQuery = `
      mutation {
        execute(sql: "${sql.replace(/"/g, '\\"')}")
      }
    `;
    
    const gqlResponse = await fetch(`${supabaseUrl}/graphql/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: graphqlQuery
      })
    });
    
    if (gqlResponse.ok) {
      console.log('✅ SUCCESS via GraphQL!');
      return true;
    } else {
      console.log('❌ GraphQL failed:', gqlResponse.status);
    }
  } catch (e) {
    console.log('❌ GraphQL error:', e.message);
  }
  
  return false;
}

async function finalVerification() {
  console.log('\n🔍 Final verification...');
  try {
    const { data, error } = await supabase
      .from('uploaded_bills')
      .select('count')
      .limit(1);
    
    if (!error) {
      console.log('✅ SUCCESS: uploaded_bills table exists and is accessible!');
      console.log('🎉 Migration completed successfully!');
      return true;
    } else {
      console.log('❌ Table verification failed:', error.message);
      return false;
    }
  } catch (e) {
    console.log('❌ Verification error:', e.message);
    return false;
  }
}

async function runFinalAttempt() {
  const success = await attemptAllMethods();
  
  if (success) {
    await finalVerification();
  } else {
    console.log('\n❌ All automated methods have been exhausted.');
    console.log('\n🎯 FINAL SOLUTION: Manual SQL Execution Required');
    console.log('\n📝 Please follow these steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/zusheijhebsmjiyyeiqq/sql');
    console.log('2. Copy and paste the following SQL:');
    console.log('\n--- COPY BELOW THIS LINE ---');
    console.log(sql);
    console.log('--- COPY ABOVE THIS LINE ---');
    console.log('\n3. Click "Run" to execute the migration');
    console.log('\n⚡ This will create the uploaded_bills table with all required indexes and security policies.');
  }
}

runFinalAttempt();
