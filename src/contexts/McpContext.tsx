// MCP Context for React
// Provides MCP client access throughout the application

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { mcpClientService, McpTool, McpResource } from '@/services/mcpClient';
import { toast } from 'sonner';

interface McpContextValue {
  servers: string[];
  tools: Map<string, McpTool[]>;
  resources: Map<string, McpResource[]>;
  connected: Map<string, boolean>;
  loading: Map<string, boolean>;
  errors: Map<string, string | null>;
  connectServer: (serverName: string) => Promise<void>;
  disconnectServer: (serverName: string) => Promise<void>;
  callTool: (serverName: string, toolName: string, args: Record<string, any>) => Promise<any>;
  refreshTools: (serverName: string) => Promise<void>;
  refreshResources: (serverName: string) => Promise<void>;
}

const McpContext = createContext<McpContextValue | undefined>(undefined);

interface McpProviderProps {
  children: ReactNode;
  servers?: Array<{ name: string; url: string; headers?: Record<string, string> }>;
}

export function McpProvider({ children, servers = [] }: McpProviderProps) {
  const [tools, setTools] = useState<Map<string, McpTool[]>>(new Map());
  const [resources, setResources] = useState<Map<string, McpResource[]>>(new Map());
  const [connected, setConnected] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [errors, setErrors] = useState<Map<string, string | null>>(new Map());

  // Register servers on mount
  useEffect(() => {
    servers.forEach((server) => {
      mcpClientService.registerServer({
        name: server.name,
        url: server.url,
        headers: server.headers,
      });
    });
  }, [servers]);

  const updateLoading = (serverName: string, isLoading: boolean) => {
    setLoading((prev) => new Map(prev).set(serverName, isLoading));
  };

  const updateError = (serverName: string, error: string | null) => {
    setErrors((prev) => new Map(prev).set(serverName, error));
  };

  const updateConnected = (serverName: string, isConnected: boolean) => {
    setConnected((prev) => new Map(prev).set(serverName, isConnected));
  };

  const connectServer = async (serverName: string) => {
    updateLoading(serverName, true);
    updateError(serverName, null);

    try {
      await mcpClientService.connect(serverName);
      updateConnected(serverName, true);
      
      // Refresh tools and resources after connection
      await refreshTools(serverName);
      await refreshResources(serverName);
      
      toast.success(`Connected to ${serverName}`);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect';
      updateError(serverName, errorMessage);
      updateConnected(serverName, false);
      toast.error(`Failed to connect to ${serverName}: ${errorMessage}`);
    } finally {
      updateLoading(serverName, false);
    }
  };

  const disconnectServer = async (serverName: string) => {
    updateLoading(serverName, true);
    try {
      await mcpClientService.disconnect(serverName);
      updateConnected(serverName, false);
      setTools((prev) => {
        const newMap = new Map(prev);
        newMap.delete(serverName);
        return newMap;
      });
      setResources((prev) => {
        const newMap = new Map(prev);
        newMap.delete(serverName);
        return newMap;
      });
      toast.success(`Disconnected from ${serverName}`);
    } catch (error: any) {
      updateError(serverName, error.message || 'Failed to disconnect');
    } finally {
      updateLoading(serverName, false);
    }
  };

  const refreshTools = async (serverName: string) => {
    try {
      const serverTools = await mcpClientService.listTools(serverName);
      setTools((prev) => new Map(prev).set(serverName, serverTools));
    } catch (error: any) {
      console.error(`Failed to refresh tools for ${serverName}:`, error);
    }
  };

  const refreshResources = async (serverName: string) => {
    try {
      const serverResources = await mcpClientService.listResources(serverName);
      setResources((prev) => new Map(prev).set(serverName, serverResources));
    } catch (error: any) {
      console.error(`Failed to refresh resources for ${serverName}:`, error);
    }
  };

  const callTool = async (
    serverName: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> => {
    try {
      const result = await mcpClientService.callTool(serverName, toolName, args);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Tool call failed';
      toast.error(`Failed to call ${toolName}: ${errorMessage}`);
      throw error;
    }
  };

  const value: McpContextValue = {
    servers: servers.map((s) => s.name),
    tools,
    resources,
    connected,
    loading,
    errors,
    connectServer,
    disconnectServer,
    callTool,
    refreshTools,
    refreshResources,
  };

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>;
}

export function useMcp() {
  const context = useContext(McpContext);
  if (context === undefined) {
    throw new Error('useMcp must be used within an McpProvider');
  }
  return context;
}
