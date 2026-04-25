'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MCPTestPage() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    testMCPConnection();
  }, []);

  const testMCPConnection = async () => {
    try {
      const response = await fetch('/api/mcp-test');
      const data = await response.json();

      if (data.success) {
        setStatus('connected');
        setConfig(data);
      } else {
        setStatus('error');
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setError('Failed to connect to MCP test API');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase MCP Server Integration Test</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Testing MCP connection...</span>
              </div>
            )}
            
            {status === 'connected' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <span className="font-semibold">Connected Successfully</span>
                </div>
                <p className="text-sm text-gray-600">Supabase MCP Server is properly integrated with your webapp</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  <span className="font-semibold">Connection Failed</span>
                </div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {config && status === 'connected' && (
          <Card>
            <CardHeader>
              <CardTitle>Configuration Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold">Supabase URL:</span>
                  <span className="ml-2 text-sm text-gray-600">{config.configuration.url}</span>
                </div>
                <div>
                  <span className="font-semibold">MCP Package:</span>
                  <span className="ml-2 text-sm text-gray-600">{config.configuration.package}</span>
                </div>
                <div>
                  <span className="font-semibold">Access Token:</span>
                  <span className="ml-2 text-sm text-green-600">Configured ✓</span>
                </div>
                <div>
                  <span className="font-semibold">Database Tables:</span>
                  <ul className="ml-4 mt-1 text-sm text-gray-600">
                    <li>• Doctors: {config.databaseTables.doctors}</li>
                    <li>• Patients: {config.databaseTables.patients}</li>
                    <li>• Bills: {config.databaseTables.bills}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <button
            onClick={testMCPConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Test Again
          </button>
        </div>
      </div>
    </div>
  );
}
