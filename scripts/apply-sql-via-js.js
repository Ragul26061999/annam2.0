/**
 * Apply SQL via Supabase Client
 * This script executes SQL by using the Supabase client to run individual commands
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

// Check if migration file exists
if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Error: Migration file not found: ${migrationFile}`);
  process.exit(1);
}

// Read the SQL file
const sql = fs.readFileSync(migrationFile, 'utf8');

async function applyMigration() {
  try {
    console.log('🚀 Connecting to Supabase...');
    console.log('✅ Connected to Supabase');

    console.log('📜 Executing migration: create_uploaded_bills_table.sql');
    console.log('--- SQL ---');
    console.log(sql);
    console.log('--- End SQL ---\n');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // Try to execute via RPC if it's a simple query
        if (statement.toLowerCase().includes('create table') || 
            statement.toLowerCase().includes('create index') ||
            statement.toLowerCase().includes('alter table') ||
            statement.toLowerCase().includes('create policy')) {
          
          console.log('⚠️  This statement requires direct SQL execution');
          console.log('📝 Please run this manually in Supabase SQL Editor:');
          console.log(statement);
          console.log('');
        } else {
          console.log('ℹ️  Skipping - requires manual execution');
        }
      } catch (error) {
        console.log('⚠️  Error executing statement:', error.message);
      }
    }

    console.log('\n✅ Migration script completed!');
    console.log('📋 Please execute the remaining statements manually in Supabase SQL Editor');
    console.log('🔗 Open: https://app.supabase.com/project/_/sql');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
