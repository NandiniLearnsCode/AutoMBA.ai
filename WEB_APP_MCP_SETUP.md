# Web App MCP Integration Guide

## Overview

The web application now includes MCP (Model Context Protocol) client integration, allowing it to connect to MCP servers and use their tools and resources directly from the browser.

## What's Been Set Up

1. ✅ **MCP SDK** - Installed `@modelcontextprotocol/sdk`
2. ✅ **MCP Client Service** - Created `src/services/mcpClient.ts`
3. ✅ **React Context** - Created `src/contexts/McpContext.tsx`
4. ✅ **Server Configuration** - Created `src/config/mcpServers.ts`
5. ✅ **React Hook** - Created `src/hooks/useMcpServer.ts`
6. ✅ **App Integration** - Integrated MCP provider into App.tsx

## Architecture

```
┌─────────────────┐
│   React App     │
│   (Browser)     │
└────────┬────────┘
         │
    ┌────▼──────────────────┐
    │  McpProvider          │
    │  (Context)             │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  McpClientService     │
    │  (Singleton)          │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  HTTP Transport       │
    │  (Streamable HTTP)     │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  MCP Servers          │
    │  (Google Maps, etc.)   │
    └───────────────────────┘
```

## Available MCP Servers

### Google Maps MCP

**Status:** ✅ Ready (when API key is configured)

**Configuration:**
- URL: `https://mapstools.googleapis.com/mcp`
- Requires: `VITE_GOOGLE_MAPS_API_KEY` in `.env`
- Tools: `search_places`, `compute_routes`, `lookup_weather`

**Setup:**
1. Get Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials)
2. Add to `.env` file:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
   ```
3. Restart dev server

### Google Calendar MCP

**Status:** ⏳ Coming Soon

**Note:** Standard Google Calendar MCP servers use STDIO (not HTTP), so they can't be used directly from a browser. For web app integration, you would need:
- An HTTP-based MCP proxy/server
- Or use the existing Google Calendar API integration (already in the app)

### Canvas MCP

**Status:** ⏳ Coming Soon

## Usage Examples

### Using the Hook in a Component

```tsx
import { useMcpServer } from '@/hooks/useMcpServer';

function MyComponent() {
  const { 
    tools, 
    connected, 
    loading, 
    connect, 
    callTool 
  } = useMcpServer('google-maps');

  useEffect(() => {
    if (!connected && !loading) {
      connect();
    }
  }, [connected, loading, connect]);

  const handleSearch = async () => {
    try {
      const result = await callTool('search_places', {
        text_query: 'coffee shops near me'
      });
      console.log('Places:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      {loading && <p>Connecting...</p>}
      {connected && (
        <div>
          <p>Connected! Available tools: {tools.length}</p>
          <button onClick={handleSearch}>Search Places</button>
        </div>
      )}
    </div>
  );
}
```

### Using the Context Directly

```tsx
import { useMcp } from '@/contexts/McpContext';

function MyComponent() {
  const { servers, tools, callTool } = useMcp();

  const handleCallTool = async () => {
    const result = await callTool('google-maps', 'search_places', {
      text_query: 'restaurants in New York'
    });
    console.log(result);
  };

  return (
    <div>
      <h3>Available Servers: {servers.join(', ')}</h3>
      <button onClick={handleCallTool}>Call Tool</button>
    </div>
  );
}
```

### Using the Service Directly

```tsx
import { mcpClientService } from '@/services/mcpClient';

// In a function or component
async function searchPlaces() {
  try {
    const result = await mcpClientService.callTool(
      'google-maps',
      'search_places',
      { text_query: 'coffee shops' }
    );
    return result;
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Google Maps MCP Tools

Once connected to Google Maps MCP, you can use these tools:

### `search_places`
Search for places, businesses, addresses, locations, points of interest.

**Example:**
```tsx
const result = await callTool('google-maps', 'search_places', {
  text_query: 'coffee shops near Columbia Business School',
  location_bias: {
    circle: {
      center: { latitude: 40.8075, longitude: -73.9626 },
      radius_meters: 1000
    }
  }
});
```

### `compute_routes`
Compute travel routes between origin and destination.

**Example:**
```tsx
const result = await callTool('google-maps', 'compute_routes', {
  origin: { address: 'Columbia Business School' },
  destination: { address: 'Times Square, New York' },
  travel_mode: 'DRIVE'
});
```

### `lookup_weather`
Get weather information for a location.

**Example:**
```tsx
const result = await callTool('google-maps', 'lookup_weather', {
  location: { address: 'New York, NY' }
});
```

## Configuration

MCP servers are configured in `src/config/mcpServers.ts`. To add a new server:

```typescript
servers.push({
  name: 'my-server',
  url: 'https://my-server.com/mcp',
  headers: {
    'Authorization': 'Bearer token',
  },
  enabled: true,
  description: 'My MCP Server',
});
```

## Environment Variables

Required environment variables (in `.env`):

```env
# Google Maps MCP
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

## Limitations & Considerations

1. **Browser Security**: MCP servers must support CORS to work from a browser
2. **HTTP Transport Only**: Only HTTP-based MCP servers can be used (not STDIO)
3. **Authentication**: Some servers require authentication tokens in headers
4. **API Keys**: Keep API keys secure, never commit to Git

## Troubleshooting

### "Failed to connect to server"
- Check that the server URL is correct
- Verify CORS is enabled on the MCP server
- Check browser console for detailed error messages
- Verify API keys are set correctly

### "Tool call failed"
- Check that the tool name is correct
- Verify the arguments match the tool's schema
- Check server logs for errors
- Ensure you're connected to the server first

### "CORS error"
- MCP servers must allow requests from your domain
- For development: `http://localhost:5173`
- Check server CORS configuration

## Next Steps

1. ✅ Set up Google Maps API key in `.env`
2. ✅ Test Google Maps MCP connection
3. ⏳ Add HTTP-based Google Calendar MCP (if available)
4. ⏳ Add Canvas LMS MCP when available
5. ⏳ Create UI components for MCP tools
6. ⏳ Integrate MCP tools into existing components

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Google Maps MCP](https://developers.google.com/maps/ai/mcp)
