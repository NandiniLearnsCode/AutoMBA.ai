// Hook for interacting with a specific MCP server
// Convenience hook that wraps useMcp for a single server

import { useMcp } from '@/contexts/McpContext';
import { useCallback, useEffect } from 'react';

export function useMcpServer(serverName: string) {
  const {
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
    clearError,
  } = useMcp();

  const serverTools = tools.get(serverName) || [];
  const serverResources = resources.get(serverName) || [];
  const isConnected = connected.get(serverName) || false;
  const isLoading = loading.get(serverName) || false;
  const error = errors.get(serverName);

  const connect = useCallback(() => {
    return connectServer(serverName);
  }, [serverName, connectServer]);

  const disconnect = useCallback(() => {
    return disconnectServer(serverName);
  }, [serverName, disconnectServer]);

  const call = useCallback(
    (toolName: string, args: Record<string, any>) => {
      return callTool(serverName, toolName, args);
    },
    [serverName, callTool]
  );

  const refresh = useCallback(() => {
    refreshTools(serverName);
    refreshResources(serverName);
  }, [serverName, refreshTools, refreshResources]);

  const clear = useCallback(() => {
    clearError(serverName);
  }, [serverName, clearError]);

  return {
    tools: serverTools,
    resources: serverResources,
    connected: isConnected,
    loading: isLoading,
    error,
    connect,
    disconnect,
    callTool: call,
    refresh,
    clearError: clear,
  };
}
