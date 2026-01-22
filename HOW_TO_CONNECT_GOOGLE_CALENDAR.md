# How to Connect Google Calendar

This guide will walk you through connecting your Google Calendar to AutoMBA.ai.

## Prerequisites

- A Google account
- Google Cloud Console access (free)

## Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing one
   - Give it a name (e.g., "AutoMBA Calendar")

3. **Enable Google Calendar API**
   - In the left sidebar, go to **APIs & Services** > **Library**
   - Search for "Google Calendar API"
   - Click on it and press **Enable**

4. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** > **Credentials**
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - If prompted, configure the OAuth consent screen first:
     - Choose **External** (unless you have a Google Workspace)
     - Fill in the required fields (App name, User support email, Developer contact)
     - Add scopes: `https://www.googleapis.com/auth/calendar`
     - Add test users (your email) if in testing mode
   - Back in Credentials, select **Web application**
   - Name it (e.g., "AutoMBA Web Client")
   - Add **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     ```
   - Add **Authorized redirect URIs**:
     ```
     http://localhost:3000/oauth2callback
     http://localhost:5173
     ```
   - Click **Create**
   - **Copy your Client ID and Client Secret** (you'll need these next)

## Step 2: Set Up Environment Variables

1. **Create a `.env` file** in the project root (if it doesn't exist)

2. **Add your Google credentials**:
   ```env
   # Google Calendar OAuth Credentials
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   
   # Optional: For frontend direct OAuth (if using)
   VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   VITE_GOOGLE_PROJECT_ID=your-project-id
   ```

   Replace:
   - `your-client-id-here.apps.googleusercontent.com` with your actual Client ID
   - `your-client-secret-here` with your actual Client Secret
   - `your-project-id` with your Google Cloud project ID (optional)

3. **Save the file**

## Step 3: Install Dependencies (if needed)

Make sure all dependencies are installed:
```bash
npm install
```

## Step 4: Start the Backend Server

The app uses a backend server to connect to Google Calendar. Start it with:

```bash
npm run dev:server
```

Or start both frontend and backend together:
```bash
npm run dev:all
```

You should see:
```
Server running on http://localhost:3000
```

## Step 5: Authenticate with Google

1. **Open your browser** and go to:
   ```
   http://localhost:3000/auth/url
   ```

2. **Copy the authentication URL** that appears

3. **Open the URL** in a new tab (or click it)

4. **Sign in with Google** and grant calendar permissions

5. **You'll be redirected back** - authentication is complete!

   The server stores your OAuth tokens for future requests.

## Step 6: Start the Frontend App

In a new terminal (if not using `dev:all`):

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Step 7: Verify Connection

1. **Open the Timeline View** in the app
2. **Your calendar events should appear automatically**
3. Events are automatically categorized by type:
   - 🎓 **Class** - classes, courses, lectures
   - 📚 **Study** - study sessions, homework, assignments
   - 💪 **Workout** - gym, workouts, exercise
   - ☕ **Networking** - coffee chats, networking events
   - 💼 **Recruiting** - interviews, info sessions
   - ⏰ **Buffer** - travel time, buffers
   - 👥 **Meeting** - other events

## Troubleshooting

### "OAuth2 client not initialized"
- Make sure your `.env` file exists in the project root
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Restart the backend server after adding environment variables

### "Failed to connect to server"
- Make sure the backend server is running on port 3000
- Check that port 3000 is not being used by another application
- Verify the server started without errors

### "Authentication required"
- Visit `http://localhost:3000/auth/url` to get the OAuth URL
- Complete the Google OAuth flow
- Make sure you granted calendar permissions

### "No events showing"
- Check that you have events in your Google Calendar
- Verify the date range you're viewing
- Check browser console for error messages

### "Redirect URI mismatch"
- Go back to Google Cloud Console
- Make sure `http://localhost:3000/oauth2callback` is in your Authorized redirect URIs
- Make sure `http://localhost:5173` is in your Authorized JavaScript origins

### Server won't start
- Check that Node.js version is v18 or higher: `node --version`
- Make sure all dependencies are installed: `npm install`
- Check that port 3000 is available

## How It Works

The app uses a **backend MCP (Model Context Protocol) server** that:
1. Handles OAuth authentication securely (keeps client secret on server)
2. Exposes Google Calendar API as MCP tools
3. The frontend connects to this server via HTTP proxy
4. Your calendar events are fetched and displayed in the timeline

## Next Steps

Once connected, you can:
- View your calendar events in the Timeline View
- See events categorized automatically
- Use the Command Center to interact with your calendar
- Let the AI suggest optimal scheduling based on your calendar

## Security Notes

- Never commit your `.env` file to git (it's already in `.gitignore`)
- Keep your Client Secret secure
- The backend server stores tokens in memory (they're lost on restart)
- For production, you'd want to persist tokens securely

---

**Need help?** Check the other documentation files:
- `GOOGLE_CALENDAR_MCP_SETUP.md` - Detailed MCP setup
- `GOOGLE_CALENDAR_SETUP.md` - Frontend OAuth setup (alternative method)
