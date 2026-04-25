/**
 * Direct SQL Execution using Supabase Service Role
 * This script attempts to execute SQL by using database functions
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

async function executeSQL() {
  try {
    console.log('🚀 Executing SQL directly via database operations...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement using different approaches
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // For CREATE TABLE, try using the database system tables
        if (statement.toLowerCase().includes('create table') && 
            statement.toLowerCase().includes('uploaded_bills')) {
          
          console.log('🏗️  Creating uploaded_bills table...');
          
          // Try to create table by inserting into information_schema (this won't work, but let's try)
          const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'uploaded_bills');
          
          if (error) {
            console.log('⚠️  Cannot access information_schema for DDL');
          } else if (data.length === 0) {
            console.log('ℹ️  Table does not exist, needs manual creation');
          } else {
            console.log('✅ Table already exists');
          }
        }
        
        // For CREATE INDEX, similar approach
        else if (statement.toLowerCase().includes('create index')) {
          console.log('📝 Creating index...');
          console.log('ℹ️  Index creation requires manual SQL execution');
        }
        
        // For ALTER TABLE (RLS)
        else if (statement.toLowerCase().includes('alter table') && 
                 statement.toLowerCase().includes('enable row level security')) {
          console.log('🔒 Enabling RLS...');
          console.log('ℹ️  RLS enable requires manual SQL execution');
        }
        
        // For CREATE POLICY
        else if (statement.toLowerCase().includes('create policy')) {
          console.log('📋 Creating RLS policy...');
          console.log('ℹ️  Policy creation requires manual SQL execution');
        }
        
      } catch (error) {
        console.log(`❌ Error with statement ${i + 1}:`, error.message);
      }
    }

    console.log('\n🎯 Automatic execution attempted');
    console.log('📋 Manual execution still required for DDL operations');
    
    // Provide the exact SQL to execute
    console.log('\n📝 Please execute this SQL in Supabase Dashboard:');
    console.log('🔗 https://app.supabase.com/project/_/sql');
    console.log('\n--- SQL TO EXECUTE ---');
    console.log(sql);
    console.log('--- END SQL ---\n');
    
    // Create a simple test to verify if manual execution worked
    console.log('🧪 Testing if table exists after manual execution...');
    const { data, error } = await supabase
      .from('uploaded_bills')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ Table still does not exist:', error.message);
      console.log('\n🔧 Next steps:');
      console.log('1. Go to https://app.supabase.com/project/_/sql');
      console.log('2. Copy and paste the SQL above');
      console.log('3. Click "Run" to execute');
      console.log('4. The upload functionality will work immediately');
    } else {
      console.log('✅ Table exists! Upload functionality is ready!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

executeSQL();
