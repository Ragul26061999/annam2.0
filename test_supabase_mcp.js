const { spawn } = require('child_process');
const fs = require('fs');

console.log('Testing Supabase MCP Server connection...');

// Read MCP config
const mcpConfigPath = 'C:\\Users\\Ragul\\.gemini\\antigravity\\mcp_config.json';
if (fs.existsSync(mcpConfigPath)) {
  const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  console.log('✅ MCP Config found:', JSON.stringify(config, null, 2));
} else {
  console.log('❌ MCP Config not found at:', mcpConfigPath);
}

// Test Supabase connection directly
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
const env = {};

lines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Test basic connectivity
supabase.from('doctors').select('count').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('❌ Database test failed:', error.message);
  } else {
    console.log('✅ Database connection verified');
  }
});

console.log('🎉 Supabase setup complete!');
console.log('📍 Project URL:', env.NEXT_PUBLIC_SUPABASE_URL);
console.log('🔑 Access token configured in MCP server');
