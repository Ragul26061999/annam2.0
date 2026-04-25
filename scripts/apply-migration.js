/**
 * Apply SQL Migration to Database
 * This script executes SQL migration files against the database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Get database connection string
// Try multiple possible environment variable names
let databaseUrl = process.env.DATABASE_URL || 
                  process.env.POSTGRES_URL ||
                  process.env.SUPABASE_DB_URL;

// If not found, try to construct from Supabase URL and service role key
if (!databaseUrl) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseServiceKey) {
    // Extract project reference from Supabase URL
    // Format: https://[project-ref].supabase.co
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (urlMatch) {
      const projectRef = urlMatch[1];
      // For Supabase, we need to construct the connection string differently
      // The database password is NOT the service role key
      // We need the actual database password from Supabase settings
      databaseUrl = `postgresql://postgres.${projectRef}:YOUR_DB_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;
      console.log('🔧 Constructed database URL - please replace YOUR_DB_PASSWORD with actual database password');
      console.log('📝 Get password from: Supabase Dashboard → Project Settings → Database → Connection string');
    }
  }
}

if (!databaseUrl) {
  console.error('❌ Error: Database connection string not found');
  console.error('Please add one of the following to your .env.local file:');
  console.error('  - DATABASE_URL');
  console.error('  - POSTGRES_URL');
  console.error('  - SUPABASE_DB_URL');
  console.error('');
  console.error('Or ensure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set');
  console.error('');
  console.error('Example: DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

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
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    console.log('🚀 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    console.log('📜 Executing migration: create_uploaded_bills_table.sql');
    console.log('--- SQL ---');
    console.log(sql);
    console.log('--- End SQL ---\n');

    await client.query(sql);
    console.log('✅ Migration applied successfully!');
    console.log('📋 Table "uploaded_bills" has been created/updated');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

applyMigration();
