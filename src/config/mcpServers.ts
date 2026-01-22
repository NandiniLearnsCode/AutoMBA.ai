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
  // Uses local backend proxy server (runs on port 3000)
  // Requires backend server to be running: npm run dev:server
  const calendarServerUrl = import.meta.env.VITE_CALENDAR_MCP_URL || 
    (typeof window !== 'undefined' 
      ? `${window.location.origin}/api/mcp-calendar/mcp`
      : 'http://localhost:5173/api/mcp-calendar/mcp');
  servers.push({
    name: 'google-calendar',
    url: calendarServerUrl,
    headers: {},
    enabled: true,
    description: 'Google Calendar MCP - Requires backend server running on port 3000',
  });

  // Canvas MCP Server
  // Uses local backend proxy server (runs on port 3001)
  // Requires backend server to be running: npm run dev:canvas
  const canvasServerUrl = import.meta.env.VITE_CANVAS_MCP_URL || 
    (typeof window !== 'undefined' 
      ? `${window.location.origin}/api/mcp-canvas/mcp`
      : 'http://localhost:5173/api/mcp-canvas/mcp');
  servers.push({
    name: 'canvas',
    url: canvasServerUrl,
    headers: {},
    enabled: true,
    description: 'Canvas LMS MCP - Requires backend server running on port 3001',
  });

  return servers.filter((s) => s.enabled || s.url); // Only return servers with URLs or enabled
}
