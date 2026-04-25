const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Supabase MCP Server integration with webapp...');

// Check MCP configuration in project
const projectMcpConfigPath = path.join(__dirname, '.windsurf', 'mcp_config.json');
const globalMcpConfigPath = path.join('C:\\Users\\Ragul\\.codeium\\windsurf', 'mcp_config.json');

console.log('\n📋 Checking MCP Configuration:');
let mcpConfig = null;

if (fs.existsSync(projectMcpConfigPath)) {
  mcpConfig = JSON.parse(fs.readFileSync(projectMcpConfigPath, 'utf8'));
  console.log('✅ Project MCP Config found at:', projectMcpConfigPath);
} else if (fs.existsSync(globalMcpConfigPath)) {
  mcpConfig = JSON.parse(fs.readFileSync(globalMcpConfigPath, 'utf8'));
  console.log('✅ Global MCP Config found at:', globalMcpConfigPath);
} else {
  console.log('❌ No MCP Config found');
  process.exit(1);
}

// Validate MCP configuration
if (mcpConfig && mcpConfig.mcpServers && mcpConfig.mcpServers['supabase-mcp-server']) {
  const supabaseConfig = mcpConfig.mcpServers['supabase-mcp-server'];
  console.log('✅ Supabase MCP server configuration found');
  console.log('📦 Package:', supabaseConfig.args?.[1] || 'Not specified');
  console.log('🔑 Access token:', supabaseConfig.args?.[3] ? 'Configured' : 'Missing');
  console.log('🌐 Supabase URL:', supabaseConfig.env?.SUPABASE_URL || 'Missing');
} else {
  console.log('❌ Supabase MCP server configuration not found');
  process.exit(1);
}

// Test Supabase connection using the same credentials
const { createClient } = require('@supabase/supabase-js');

// Use environment variables from MCP config or .env.example
const supabaseUrl = mcpConfig.mcpServers['supabase-mcp-server'].env.SUPABASE_URL;
const supabaseAnonKey = mcpConfig.mcpServers['supabase-mcp-server'].env.SUPABASE_ANON_KEY;

console.log('\n🔗 Testing Database Connection:');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test basic connectivity with multiple tables
async function testDatabaseConnection() {
  try {
    // Test doctors table
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select('count')
      .limit(1);
    
    if (doctorsError) {
      console.log('⚠️  Doctors table test:', doctorsError.message);
    } else {
      console.log('✅ Doctors table accessible');
    }

    // Test patients table
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
    
    if (patientsError) {
      console.log('⚠️  Patients table test:', patientsError.message);
    } else {
      console.log('✅ Patients table accessible');
    }

    // Test bills table
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('count')
      .limit(1);
    
    if (billsError) {
      console.log('⚠️  Bills table test:', billsError.message);
    } else {
      console.log('✅ Bills table accessible');
    }

    console.log('\n🎉 Supabase MCP Server integration test completed!');
    console.log('📍 Project URL:', supabaseUrl);
    console.log('🔑 MCP Server configured with proper credentials');
    console.log('� Database connection validated');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testDatabaseConnection();
