// MCP Server Configuration
// Defines the MCP servers available to the web application

export interface McpServerConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
  enabled: boolean;
  description?: string;
}

/**
 * Get MCP server configurations
 * Reads from environment variables for API keys
 */
export function getMcpServerConfigs(): McpServerConfig[] {
  const servers: McpServerConfig[] = [];

  // Google Maps MCP Server
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleMapsApiKey) {
    servers.push({
      name: 'google-maps',
      url: 'https://mapstools.googleapis.com/mcp',
      headers: {
        'X-Goog-Api-Key': googleMapsApiKey,
      },
      enabled: true,
      description: 'Google Maps API - Places, Routes, Weather',
    });
  } else {
    // Still register but disabled
    servers.push({
      name: 'google-maps',
      url: 'https://mapstools.googleapis.com/mcp',
      headers: {},
      enabled: false,
      description: 'Google Maps API - Requires VITE_GOOGLE_MAPS_API_KEY',
    });
  }

  // Google Calendar MCP Server
  // In development: uses Vite proxy to localhost:3000
  // In production: served from same origin
  const calendarServerUrl = import.meta.env.VITE_CALENDAR_MCP_URL ||
    (import.meta.env.DEV
      ? '/api/mcp-calendar/mcp'
      : '/mcp');
  servers.push({
    name: 'google-calendar',
    url: calendarServerUrl,
    headers: {},
    enabled: true,
    description: 'Google Calendar MCP - Requires backend server running on port 3000',
  });

  // Canvas MCP Server
  // Placeholder for future Canvas LMS MCP integration
  servers.push({
    name: 'canvas',
    url: '', // Will be set up when Canvas MCP is available
    headers: {},
    enabled: false,
    description: 'Canvas LMS - Coming soon',
  });

  return servers.filter((s) => s.enabled || s.url); // Only return servers with URLs or enabled
}
