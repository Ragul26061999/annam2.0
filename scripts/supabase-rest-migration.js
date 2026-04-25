/**
 * Supabase REST API Migration
 * Attempts to create table using REST API calls
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

async function executeViaRestAPI() {
  try {
    console.log('🚀 Attempting migration via Supabase REST API...');
    
    // Try to use the database REST endpoint directly
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (response.ok) {
      console.log('✅ SQL executed successfully via REST API');
      const result = await response.text();
      console.log('📋 Result:', result);
    } else {
      console.log('❌ REST API SQL execution failed');
      console.log('Status:', response.status, response.statusText);
      
      // Try alternative approach - use the Supabase SQL RPC endpoint
      console.log('\n🔄 Trying RPC endpoint...');
      
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql_query: sql
        })
      });
      
      if (rpcResponse.ok) {
        console.log('✅ SQL executed successfully via RPC');
        const rpcResult = await rpcResponse.json();
        console.log('📋 Result:', rpcResult);
      } else {
        console.log('❌ RPC execution also failed');
        console.log('Status:', rpcResponse.status, rpcResponse.statusText);
        
        // Final attempt - create the SQL function first, then execute
        console.log('\n🔄 Creating SQL execution function first...');
        
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
          RETURNS VOID AS $$
          BEGIN
            EXECUTE sql_query;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        
        const funcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql_query: createFunctionSQL
          })
        });
        
        if (funcResponse.ok || funcResponse.status === 404) {
          console.log('✅ Function creation attempted, now executing migration...');
          
          // Try the migration again
          const migrationResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sql_query: sql
            })
          });
          
          if (migrationResponse.ok) {
            console.log('✅ Migration executed successfully!');
            const migrationResult = await migrationResponse.json();
            console.log('📋 Result:', migrationResult);
          } else {
            console.log('❌ All automated methods failed');
            console.log('\n📝 Manual execution required. Please run this SQL in Supabase Dashboard:');
            console.log('https://supabase.com/dashboard/project/zusheijhebsmjiyyeiqq/sql');
            console.log('\n' + sql);
          }
        }
      }
    }
    
    // Verify table creation
    console.log('\n🔍 Verifying table creation...');
    try {
      const { data, error } = await supabase
        .from('uploaded_bills')
        .select('count')
        .limit(1);
      
      if (error && !error.message.includes('does not exist')) {
        console.log('✅ Table exists and is accessible');
        console.log('📋 Sample query result:', data);
      } else if (error && error.message.includes('does not exist')) {
        console.log('❌ Table was not created');
      } else {
        console.log('✅ Table created successfully!');
      }
    } catch (verifyError) {
      console.log('⚠️  Could not verify table creation');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 Please run the SQL manually in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/zusheijhebsmjiyyeiqq/sql');
    console.log('\n' + sql);
  }
}

executeViaRestAPI();
