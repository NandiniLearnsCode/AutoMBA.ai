# MCP Server Setup Guide

This guide will help you set up Model Context Protocol (MCP) servers for Google Calendar, Canvas, and Google Maps in Cursor IDE.

## Overview

MCP (Model Context Protocol) servers allow Cursor IDE to interact with external services like Google Calendar, Canvas LMS, and Google Maps. This enables AI assistants in Cursor to help you manage your calendar, assignments, and location data.

## Prerequisites

1. **Node.js** installed (v18 or higher recommended)
2. **Cursor IDE** installed
3. **Google Cloud Console** access (for Calendar and Maps)
4. **Canvas LMS API** credentials (for Canvas MCP - coming soon)

## Setup Steps

### 1. Install Required Packages

First, install the Google Calendar MCP server package globally:

```bash
npm install -g @cocal/google-calendar-mcp
```

Or use npx (no installation needed):
- The configuration below uses `npx` which automatically downloads and runs the package

### 2. Google Calendar MCP Setup

#### A. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth client ID**
6. Choose **Desktop app** (not Web application for MCP servers)
7. Download the credentials JSON file
8. Save it as `google-oauth-credentials.json` in a secure location (e.g., `%USERPROFILE%\.mcp-credentials\`)

#### B. Save Your Credentials File

1. Save the downloaded credentials JSON file as:
   - **Windows**: `C:\Users\YourUsername\.mcp-credentials\google-oauth-credentials.json`
   - **macOS/Linux**: `~/.mcp-credentials/google-oauth-credentials.json`

2. The credentials directory has been created in your home folder
3. ⚠️ **Important:** The file must be named exactly `google-oauth-credentials.json`

#### C. Configure MCP in Cursor

The MCP configuration file has been created at:
- **Windows**: `%USERPROFILE%\.cursor\mcp.json` (e.g., `C:\Users\Siddhant Patra\.cursor\mcp.json`)
- **macOS/Linux**: `~/.cursor/mcp.json`

The configuration file is already set up with:
- ✅ Google Calendar MCP server (ready to use once credentials are added)
- ✅ Google Maps MCP server (ready - just add API key)
- ⏳ Canvas MCP server (prepared for future setup)

### 3. Google Maps MCP Setup

Google Maps MCP uses Google's official managed server. You only need:

1. A **Google Maps API Key** with the following APIs enabled:
   - Places API (New)
   - Routes API
   - Geocoding API (optional)

2. Get your API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials)

3. Add it to your `.env` file:
   ```env
   GOOGLE_MAPS_API_KEY=your-api-key-here
   ```

The MCP configuration file includes the Google Maps MCP server setup (commented out - uncomment when ready).

### 4. Canvas MCP Setup (Coming Soon)

Canvas LMS MCP server setup will be added when the server implementation is available. The configuration structure is prepared in `mcp.json`.

## Configuration File Location

The MCP configuration file is stored at:
- **Windows**: `C:\Users\YourUsername\.cursor\mcp.json`
- **macOS/Linux**: `~/.cursor/mcp.json`

## First-Time Authentication

When you first use the Google Calendar MCP server:

1. Cursor will prompt you to authenticate
2. A browser window will open for Google OAuth
3. Sign in with your Google account
4. Grant calendar permissions
5. Tokens will be saved locally for future use

## Verifying Setup

1. **Restart Cursor IDE** after creating/updating `mcp.json`
2. Open a chat in Cursor
3. Try asking: "What events do I have in my Google Calendar today?"
4. If set up correctly, Cursor should be able to access your calendar

## Troubleshooting

### Google Calendar MCP Issues

**Error: "Credentials file not found"**
- Check that the path in `GOOGLE_OAUTH_CREDENTIALS` environment variable is correct
- Ensure the credentials file exists and is valid JSON
- Use absolute paths (not relative) in the environment variable

**Error: "OAuth authentication failed"**
- Make sure you created a "Desktop app" OAuth client (not "Web application")
- Check that the Google Calendar API is enabled in your Google Cloud project
- Verify the credentials JSON file is not corrupted

**Error: "Token refresh failed"**
- Delete the token file (usually `.gcp-saved-tokens.json` in your home directory)
- Re-authenticate by running the MCP server again

### Google Maps MCP Issues

**Error: "API key invalid"**
- Verify your API key is correct
- Check that the required APIs (Places, Routes) are enabled
- Ensure billing is enabled for your Google Cloud project (Maps API requires billing)

### General MCP Issues

**MCP servers not appearing in Cursor**
- Restart Cursor IDE after configuration changes
- Check that `mcp.json` is valid JSON (no syntax errors)
- Verify the command/path in `mcp.json` is correct
- Check Cursor's console/logs for error messages

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials files to Git**
   - The `.env` file is already in `.gitignore`
   - Keep `google-oauth-credentials.json` outside the project directory
   - Store it in a secure location like `%USERPROFILE%\.mcp-credentials\`

2. **Protect your API keys**
   - Google Maps API keys should be restricted by IP/HTTP referrer
   - Use separate API keys for development and production
   - Rotate keys periodically

3. **Token storage**
   - OAuth tokens are stored locally in your user directory
   - These files contain sensitive authentication tokens
   - Do not share or commit token files

## Next Steps

1. ✅ Set up Google Calendar MCP (instructions above)
2. ⏳ Set up Google Maps MCP when ready (uncomment in mcp.json)
3. ⏳ Set up Canvas MCP when implementation is available

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Google Calendar MCP GitHub](https://github.com/nspady/google-calendar-mcp)
- [Google Maps MCP Documentation](https://developers.google.com/maps/ai/mcp)
- [Cursor MCP Setup Guide](https://docs.cursor.com/context/mcp)
