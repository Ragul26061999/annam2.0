/**
 * Direct Supabase Database Migration
 * Uses PostgreSQL client to connect directly to Supabase database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase database connection string
// Extracted from Supabase URL: https://zusheijhebsmjiyyeiqq.supabase.co
const projectRef = 'zusheijhebsmjiyyeiqq';
const databaseUrl = `postgresql://postgres.${projectRef}:@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

// Read the SQL migration file
const migrationFile = path.resolve(__dirname, '../database/migrations/create_uploaded_bills_table.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

async function executeDirectMigration() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Connecting directly to Supabase database...');
    console.log(`📡 Project: ${projectRef}`);
    
    await client.connect();
    console.log('✅ Connected to Supabase database');

    console.log('📜 Executing uploaded_bills table creation...');
    console.log('--- SQL ---');
    console.log(sql);
    console.log('--- End SQL ---\n');

    // Execute the migration
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

    // Verify table creation
    console.log('🔍 Verifying table creation...');
    const verifyQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'uploaded_bills'
    `;
    
    const result = await client.query(verifyQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ SUCCESS: uploaded_bills table created successfully!');
      
      // Get table structure
      const structureQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'uploaded_bills'
        ORDER BY ordinal_position
      `;
      
      const structureResult = await client.query(structureQuery);
      
      console.log('\n📋 Table structure:');
      structureResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable}) ${col.column_default ? `[DEFAULT: ${col.column_default}]` : ''}`);
      });
      
      // Check indexes
      const indexQuery = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'uploaded_bills'
      `;
      
      const indexResult = await client.query(indexQuery);
      if (indexResult.rows.length > 0) {
        console.log('\n📊 Indexes created:');
        indexResult.rows.forEach(idx => {
          console.log(`  - ${idx.indexname}`);
        });
      }
      
      // Check RLS policies
      const policyQuery = `
        SELECT policyname, permissive, roles, cmd, qual
        FROM pg_policies 
        WHERE tablename = 'uploaded_bills'
      `;
      
      const policyResult = await client.query(policyQuery);
      if (policyResult.rows.length > 0) {
        console.log('\n🔒 RLS Policies created:');
        policyResult.rows.forEach(policy => {
          console.log(`  - ${policy.policyname} (${policy.cmd})`);
        });
      }
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('📋 uploaded_bills table is ready for use with proper indexes and security policies.');
      
    } else {
      console.log('❌ Table verification failed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n🔑 Authentication failed. This means we need the actual database password.');
      console.log('💡 The Supabase service role key provides API access but not direct database access.');
      console.log('\n📝 Alternative: Use the Supabase Dashboard SQL Editor:');
      console.log('1. Go to https://supabase.com/dashboard/project/zusheijhebsmjiyyeiqq/sql');
      console.log('2. Paste and run the SQL from the migration file');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n🌐 Connection failed. Check network connectivity to Supabase.');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

executeDirectMigration();
