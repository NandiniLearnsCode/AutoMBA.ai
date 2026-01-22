// MCP Client Service
// Handles connections to MCP servers for the web application

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface McpServerConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export class McpClientService {
  private clients: Map<string, Client> = new Map();
  private servers: Map<string, McpServerConfig> = new Map();

  /**
   * Register an MCP server configuration
   */
  registerServer(config: McpServerConfig): void {
    this.servers.set(config.name, config);
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverName: string): Promise<Client> {
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }

    const config = this.servers.get(serverName);
    if (!config) {
      throw new Error(`Server ${serverName} not registered`);
    }

    const client = new Client({
      name: "nexus-web-app",
      version: "1.0.0",
    });

    const transport = new StreamableHTTPClientTransport(
      new URL(config.url),
      {
        requestInit: {
          headers: config.headers || {},
        },
      }
    );

    await client.connect(transport);
    this.clients.set(serverName, client);

    return client;
  }

  /**
   * Get a connected client (connects if not already connected)
   */
  async getClient(serverName: string): Promise<Client> {
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }
    return this.connect(serverName);
  }

  /**
   * List available tools from a server
   */
  async listTools(serverName: string): Promise<McpTool[]> {
    const client = await this.getClient(serverName);
    const response = await client.listTools();
    return response.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Call a tool on a server
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const client = await this.getClient(serverName);
    const response = await client.callTool({
      name: toolName,
      arguments: args,
    });
    return response.content;
  }

  /**
   * List available resources from a server
   */
  async listResources(serverName: string): Promise<McpResource[]> {
    const client = await this.getClient(serverName);
    const response = await client.listResources();
    return response.resources.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  /**
   * Read a resource from a server
   */
  async readResource(serverName: string, uri: string): Promise<any> {
    const client = await this.getClient(serverName);
    const response = await client.readResource({ uri });
    return response.contents;
  }

  /**
   * Disconnect from a server
   */
  async disconnect(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      // Note: Client doesn't have explicit disconnect, but we can remove from map
      this.clients.delete(serverName);
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    for (const serverName of this.clients.keys()) {
      await this.disconnect(serverName);
    }
  }
}

// Singleton instance
export const mcpClientService = new McpClientService();
