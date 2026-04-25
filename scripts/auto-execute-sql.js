/**
 * Auto-execute SQL in Supabase using REST API
 * This script executes SQL directly via Supabase's SQL REST API
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
const supabaseRestUrl = `https://api.supabase.com/v1/projects/${projectRef}/sql`;

// Read the SQL migration file
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

async function executeSQL() {
  try {
    console.log('🚀 Auto-executing SQL in Supabase...');
    console.log(`📝 Project: ${projectRef}`);
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement using the REST API
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const response = await fetch(supabaseRestUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: statement
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.log(`⚠️  Statement ${i + 1} failed:`, errorData);
          continue;
        }

        const result = await response.json();
        console.log(`✅ Statement ${i + 1} executed successfully`);
        
      } catch (error) {
        console.log(`❌ Error executing statement ${i + 1}:`, error.message);
      }
    }

    console.log('\n🎉 SQL execution completed!');
    
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
