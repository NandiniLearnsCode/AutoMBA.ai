# MCP Setup Quick Start

## 🚀 Quick Setup Checklist

Follow these steps to get your MCP servers up and running:

### ✅ Step 1: Google Calendar MCP (Required First)

1. **Get Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create/select a project
   - Enable **Google Calendar API**
   - Create OAuth 2.0 Client ID → Choose **Desktop app**
   - Download credentials JSON

2. **Save Credentials:**
   - Save the downloaded file as: `C:\Users\YourUsername\.mcp-credentials\google-oauth-credentials.json`
   - ⚠️ **Important:** The file must be named exactly `google-oauth-credentials.json`
   - The directory `.mcp-credentials` has been created in your home folder

3. **Verify Configuration:**
   - The `mcp.json` file is already configured at: `%USERPROFILE%\.cursor\mcp.json`
   - Path is set to: `C:\Users\Siddhant Patra\.mcp-credentials\google-oauth-credentials.json`

4. **Restart Cursor:**
   - Close and reopen Cursor IDE
   - MCP servers will load automatically

5. **First Authentication:**
   - When you first use Google Calendar features in Cursor
   - A browser window will open for OAuth login
   - Sign in and grant calendar permissions
   - Tokens are saved automatically

### ⏳ Step 2: Google Maps MCP (Optional - When Ready)

1. **Get Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials)
   - Create an API key
   - Enable these APIs:
     - Places API (New)
     - Routes API
     - Geocoding API (optional)

2. **Update Configuration:**
   - Open: `C:\Users\Siddhant Patra\.cursor\mcp.json`
   - Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key
   - Save the file

3. **Restart Cursor**

### ⏳ Step 3: Canvas MCP (Coming Soon)

Canvas LMS MCP server setup will be available when the implementation is ready. Configuration structure is prepared.

## 📋 File Locations

| Item | Location |
|------|----------|
| MCP Config | `C:\Users\Siddhant Patra\.cursor\mcp.json` |
| Credentials Dir | `C:\Users\Siddhant Patra\.mcp-credentials\` |
| Google Calendar Creds | `C:\Users\Siddhant Patra\.mcp-credentials\google-oauth-credentials.json` |

## 🧪 Test Your Setup

1. Restart Cursor IDE
2. Open a chat window in Cursor
3. Try: "What events do I have in my Google Calendar today?"
4. If working: Cursor will access your calendar and show events
5. If not working: Check the troubleshooting section in `MCP_SETUP.md`

## ⚠️ Important Notes

- **Never commit credentials files to Git** (they're in `.gitignore`)
- **Keep API keys secure** - don't share them
- **Restart Cursor** after any configuration changes
- The credentials directory `.mcp-credentials` is in your home folder, not the project

## 📚 More Details

For detailed setup instructions, troubleshooting, and security notes, see:
- **Full Guide:** `MCP_SETUP.md`
- **Setup Documentation:** This file

## 🆘 Quick Troubleshooting

**Calendar MCP not working?**
- Check that `google-oauth-credentials.json` exists at the configured path
- Verify it's a "Desktop app" type OAuth credential (not "Web application")
- Restart Cursor after adding credentials

**Maps MCP not working?**
- Verify API key is correct in `mcp.json`
- Check that required APIs are enabled in Google Cloud Console
- Ensure billing is enabled (Maps API requires billing)

**Still having issues?**
- See `MCP_SETUP.md` for detailed troubleshooting
- Check Cursor's console/logs for error messages
