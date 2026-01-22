# Google Calendar MCP Server

Backend server that exposes Google Calendar API as an MCP (Model Context Protocol) server over HTTP.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   Create a `.env` file in the project root (not in server/):
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   ```

3. **Run the server:**
   ```bash
   npm run dev:server
   ```

   Or run both frontend and backend together:
   ```bash
   npm run dev:all
   ```

## OAuth Authentication

1. Start the server: `npm run dev:server`
2. Visit: `http://localhost:3000/auth/url`
3. Copy the URL and open it in a browser
4. Authenticate with Google
5. You'll be redirected back - authentication complete!

## MCP Endpoint

The server exposes MCP protocol at:
- `http://localhost:3000/mcp`
- Or via Vite proxy: `http://localhost:5173/api/mcp-calendar/mcp`

## Available Tools

- `list_calendars` - List all calendars
- `list_events` - List events from a calendar
- `get_event` - Get a specific event
- `create_event` - Create a new event

## Development

The server runs on port 3000 by default. Vite dev server (port 5173) proxies `/api/mcp-calendar/*` requests to this server.
