# Google Calendar MCP Setup for Web App

## Overview

Google Calendar MCP is now configured to work in the web application through a backend proxy server. The backend server exposes Google Calendar API as an MCP server over HTTP.

## Architecture

```
Web App (Browser)
    ↓
Vite Dev Server (port 5173)
    ↓ (proxy: /api/mcp-calendar/*)
Backend MCP Server (port 3000)
    ↓
Google Calendar API
```

## Setup Steps

### 1. Environment Variables

Add these to your `.env` file (project root):

```env
# Google Calendar MCP Backend
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

**Note:** Use the same Google OAuth credentials you're using for the frontend.

### 2. Start the Backend Server

Run the MCP server:
```bash
npm run dev:server
```

Or run both frontend and backend together:
```bash
npm run dev:all
```

### 3. OAuth Authentication

1. Start the backend server (`npm run dev:server`)
2. Visit: `http://localhost:3000/auth/url` in your browser
3. Copy the authentication URL
4. Open it in a new tab
5. Sign in with Google and grant calendar permissions
6. You'll be redirected back - authentication complete!

The server stores the OAuth tokens for future requests.

### 4. Access MCP from Web App

The web app is already configured to connect to the MCP server via:
- Proxy URL: `/api/mcp-calendar/mcp` (automatically proxied by Vite)
- Direct URL: `http://localhost:3000/mcp`

## Available MCP Tools

Once connected, you can use these tools via the MCP client:

- **`list_calendars`** - List all calendars available to the user
- **`list_events`** - List events from a calendar (supports time range, calendar ID)
- **`get_event`** - Get a specific event by ID
- **`create_event`** - Create a new calendar event

## Usage in Components

```tsx
import { useMcpServer } from '@/hooks/useMcpServer';

function MyComponent() {
  const { connected, tools, callTool, connect } = useMcpServer('google-calendar');

  useEffect(() => {
    if (!connected) {
      connect();
    }
  }, [connected, connect]);

  const handleListEvents = async () => {
    try {
      const result = await callTool('list_events', {
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10
      });
      console.log('Events:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      {connected ? (
        <button onClick={handleListEvents}>List Events</button>
      ) : (
        <p>Connecting to Google Calendar MCP...</p>
      )}
    </div>
  );
}
```

## Troubleshooting

### "OAuth2 client not initialized"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart the backend server after adding environment variables

### "Failed to connect to server"
- Make sure the backend server is running on port 3000
- Check that Vite proxy is configured (already done in `vite.config.ts`)
- Verify `/api/mcp-calendar/mcp` endpoint is accessible

### "Authentication required"
- Visit `http://localhost:3000/auth/url` to get OAuth URL
- Complete the Google OAuth flow
- Tokens are stored by the backend server

### Server not starting
- Check that port 3000 is not in use
- Verify Node.js version (should be v18+)
- Check server logs for errors

## Development Workflow

1. **Start backend server:**
   ```bash
   npm run dev:server
   ```

2. **Authenticate (first time only):**
   - Visit `http://localhost:3000/auth/url`
   - Complete OAuth flow

3. **Start frontend (in another terminal):**
   ```bash
   npm run dev
   ```

4. **Or run both together:**
   ```bash
   npm run dev:all
   ```

## Files Created

- `server/mcp-calendar-server.js` - Backend MCP server
- `server/README.md` - Server documentation
- Updated `vite.config.ts` - Added proxy configuration
- Updated `src/config/mcpServers.ts` - Added Google Calendar MCP config

## Notes

- The backend server runs on port 3000
- OAuth tokens are stored in memory (will be lost on server restart)
- For production, you'd want to persist tokens securely
- The server implements a simplified MCP protocol suitable for this use case
