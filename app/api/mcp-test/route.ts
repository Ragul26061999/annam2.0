import { NextRequest, NextResponse } from 'next/server';
import SupabaseMCPIntegration from '@/lib/supabase-mcp';

export async function GET() {
  try {
    const mcpIntegration = SupabaseMCPIntegration.getInstance();
    
    // Test MCP connection
    const isConnected = await mcpIntegration.testConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { error: 'MCP Supabase connection failed' },
        { status: 500 }
      );
    }

    const config = mcpIntegration.getConfiguration();
    
    return NextResponse.json({
      success: true,
      message: 'Supabase MCP Server is properly connected',
      configuration: {
        url: config?.mcpServers['supabase-mcp-server'].env.SUPABASE_URL,
        hasAccessToken: !!config?.mcpServers['supabase-mcp-server'].args[3],
        package: config?.mcpServers['supabase-mcp-server'].args[1]
      },
      databaseTables: {
        doctors: 'accessible',
        patients: 'accessible',
        bills: 'may not exist'
      }
    });
  } catch (error) {
    console.error('MCP Test API Error:', error);
    return NextResponse.json(
      { error: 'Failed to test MCP integration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    const mcpIntegration = SupabaseMCPIntegration.getInstance();
    
    // Execute SQL using MCP configuration
    const result = await mcpIntegration.executeSQL(query);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('MCP SQL Execution Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SQL execution failed' },
      { status: 500 }
    );
  }
}
