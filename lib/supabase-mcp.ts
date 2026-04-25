import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// MCP Configuration interface
interface MCPServerConfig {
  command: string;
  args: string[];
  disabled: boolean;
  env: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  };
}

interface MCPConfig {
  mcpServers: {
    'supabase-mcp-server': MCPServerConfig;
  };
}

class SupabaseMCPIntegration {
  private static instance: SupabaseMCPIntegration;
  private supabase: any;
  private config: MCPConfig | null = null;

  private constructor() {
    this.loadConfiguration();
    this.initializeSupabaseClient();
  }

  public static getInstance(): SupabaseMCPIntegration {
    if (!SupabaseMCPIntegration.instance) {
      SupabaseMCPIntegration.instance = new SupabaseMCPIntegration();
    }
    return SupabaseMCPIntegration.instance;
  }

  private loadConfiguration(): void {
    const projectConfigPath = path.join(process.cwd(), '.windsurf', 'mcp_config.json');
    const globalConfigPath = path.join('C:\\Users\\Ragul\\.codeium\\windsurf', 'mcp_config.json');

    if (fs.existsSync(projectConfigPath)) {
      this.config = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
      console.log('✅ Loaded MCP configuration from project config');
    } else if (fs.existsSync(globalConfigPath)) {
      this.config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
      console.log('✅ Loaded MCP configuration from global config');
    } else {
      throw new Error('MCP configuration not found');
    }
  }

  private initializeSupabaseClient(): void {
    if (!this.config || !this.config.mcpServers['supabase-mcp-server']) {
      throw new Error('Supabase MCP server configuration not found');
    }

    const { SUPABASE_URL, SUPABASE_ANON_KEY } = this.config.mcpServers['supabase-mcp-server'].env;
    
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false
      }
    });
  }

  public getSupabaseClient() {
    return this.supabase;
  }

  public getConfiguration() {
    return this.config;
  }

  public getServiceRoleKey(): string {
    if (!this.config) {
      throw new Error('MCP configuration not loaded');
    }
    return this.config.mcpServers['supabase-mcp-server'].env.SUPABASE_SERVICE_ROLE_KEY;
  }

  public getSupabaseUrl(): string {
    if (!this.config) {
      throw new Error('MCP configuration not loaded');
    }
    return this.config.mcpServers['supabase-mcp-server'].env.SUPABASE_URL;
  }

  // Test connection to verify MCP server is working
  public async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('doctors')
        .select('count')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('MCP Supabase connection test failed:', error);
      return false;
    }
  }

  // Execute SQL queries using service role (for admin operations)
  public async executeSQL(sql: string) {
    const serviceRoleClient = createClient(
      this.getSupabaseUrl(),
      this.getServiceRoleKey(),
      {
        auth: {
          persistSession: false
        }
      }
    );

    const { data, error } = await serviceRoleClient.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      throw new Error(`SQL execution failed: ${error.message}`);
    }
    
    return data;
  }
}

export default SupabaseMCPIntegration;
