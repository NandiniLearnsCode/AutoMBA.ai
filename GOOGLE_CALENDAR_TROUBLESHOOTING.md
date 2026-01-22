# Google Calendar Connection Troubleshooting

## Quick Checklist

Follow these steps in order:

### 1. Check if Backend Server is Running

**Check the terminal:**
- You should see: `Google Calendar MCP Server running on http://localhost:3000`
- If not, start it: `npm run dev:server`

**Test the server:**
- Open browser: `http://localhost:3000/health`
- Should show: `{"status":"ok","oauth2Initialized":true,"authenticated":false}`

### 2. Check Environment Variables

**Verify `.env` file exists in project root:**
```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

**Common issues:**
- File is named `.env` (not `.env.txt` or `env`)
- File is in project root (not in `server/` folder)
- No extra spaces around `=`
- Values are not in quotes

**Restart server after changing `.env`:**
- Stop server (Ctrl+C)
- Start again: `npm run dev:server`

### 3. Authenticate with Google

**If you see "OAuth2 not authenticated":**

1. **Get authentication URL:**
   - Visit: `http://localhost:3000/auth/url`
   - Copy the URL that appears

2. **Open the URL in browser:**
   - Sign in with your Google account
   - Grant calendar permissions
   - You'll be redirected to a success page

3. **Verify authentication:**
   - Visit: `http://localhost:3000/health`
   - Should show: `"authenticated": true`

### 4. Check Frontend Connection

**Verify Vite proxy is working:**
- Frontend should be running on `http://localhost:5173`
- Check browser console for errors
- Look for: "Failed to connect" or "Network error"

**Test MCP endpoint:**
- Open browser: `http://localhost:5173/api/mcp-calendar/mcp`
- Should not show "Cannot GET" error (POST only, but should not be 404)

### 5. Common Error Messages

#### "OAuth2 client not initialized"
- **Fix:** Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`
- **Restart:** Stop and start the server

#### "OAuth2 not authenticated"
- **Fix:** Visit `http://localhost:3000/auth/url` and complete OAuth flow
- **Note:** Tokens are stored in server memory (lost on restart)

#### "Failed to connect to server"
- **Check:** Is server running? `http://localhost:3000/health`
- **Check:** Is port 3000 in use? `netstat -ano | findstr :3000`
- **Fix:** Kill process or change port

#### "CORS error" or "Network error"
- **Check:** Frontend running on port 5173?
- **Check:** Server CORS allows `http://localhost:5173`
- **Fix:** Restart both frontend and backend

#### "404 Not Found" on `/api/mcp-calendar/mcp`
- **Check:** `vite.config.ts` has proxy configuration
- **Check:** Frontend is running
- **Fix:** Restart Vite dev server

### 6. Step-by-Step Fix

**If nothing works, start fresh:**

1. **Stop all servers:**
   ```bash
   # Press Ctrl+C in all terminals
   ```

2. **Check `.env` file:**
   ```bash
   # Make sure it exists and has correct values
   ```

3. **Start backend server:**
   ```bash
   npm run dev:server
   ```
   - Should see: "Google Calendar MCP Server running"
   - Should NOT see: "Google OAuth credentials not found"

4. **Authenticate:**
   - Visit: `http://localhost:3000/auth/url`
   - Complete OAuth flow

5. **Start frontend:**
   ```bash
   npm run dev
   ```

6. **Test in browser:**
   - Open: `http://localhost:5173`
   - Check browser console for errors
   - Calendar events should load

### 7. Verify Everything Works

**Backend health check:**
```bash
curl http://localhost:3000/health
# Or visit in browser
```

**Should return:**
```json
{
  "status": "ok",
  "oauth2Initialized": true,
  "authenticated": true,
  "authUrl": null
}
```

**If `authenticated: false`:**
- Visit `http://localhost:3000/auth/url` again
- Complete OAuth flow

### 8. Still Not Working?

**Check server logs:**
- Look at terminal running `npm run dev:server`
- Look for error messages
- Common errors:
  - "Port 3000 already in use" → Kill process on port 3000
  - "Cannot find module" → Run `npm install`
  - "Invalid credentials" → Check `.env` values

**Check browser console:**
- Open DevTools (F12)
- Go to Console tab
- Look for red error messages
- Common errors:
  - "Failed to fetch" → Server not running
  - "CORS error" → Server CORS misconfigured
  - "401 Unauthorized" → Not authenticated

**Test MCP connection manually:**
```bash
# In PowerShell or terminal
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

Should return JSON with server info.

## Quick Test Commands

**Check if server is running:**
```bash
# Windows PowerShell
Test-NetConnection localhost -Port 3000
```

**Check environment variables are loaded:**
- Server startup should NOT show: "Google OAuth credentials not found"
- If it does, check `.env` file

**Kill process on port 3000:**
```bash
# Find PID
netstat -ano | findstr :3000
# Kill it (replace <PID> with actual number)
taskkill /PID <PID> /F
```

## Need More Help?

1. Check `HOW_TO_CONNECT_GOOGLE_CALENDAR.md` for full setup
2. Verify Google Cloud Console OAuth settings
3. Check that redirect URI matches: `http://localhost:3000/oauth2callback`
