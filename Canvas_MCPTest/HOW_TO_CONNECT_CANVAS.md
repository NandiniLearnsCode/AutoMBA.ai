# How to Connect Canvas LMS

This guide will walk you through connecting your Canvas LMS account to AutoMBA.ai to import assignments and course data.

## Prerequisites

- A Canvas LMS account (from your school/institution)
- Access to your Canvas instance URL
- Ability to generate a Canvas API access token

## Step 1: Get Your Canvas Instance URL

Your Canvas instance URL is typically:
- `https://[your-school].instructure.com`
- Or a custom domain like `https://canvas.yourschool.edu`

**Find it by:**
1. Logging into Canvas in your browser
2. Looking at the URL in your address bar
3. It will be something like: `https://columbia.instructure.com` or `https://canvas.columbia.edu`

## Step 2: Generate a Canvas API Access Token

1. **Log into Canvas** with your account

2. **Go to Account Settings:**
   - Click on your profile picture/avatar in the top left
   - Click "Settings" or go to: `https://[your-canvas-url]/profile/settings`

3. **Scroll down to "Approved Integrations"** section

4. **Click "+ New Access Token"**

5. **Fill in the form:**
   - **Purpose:** "AutoMBA.ai Integration" (or any description)
   - **Expires:** Choose a date (or leave blank for no expiration)
   - **Scopes:** The app needs these scopes:
     - ✅ `url:GET|/api/v1/courses`
     - ✅ `url:GET|/api/v1/courses/:course_id/assignments`
     - ✅ `url:GET|/api/v1/users/:user_id/profile`

6. **Click "Generate Token"**

7. **Copy the token immediately** - you won't be able to see it again!
   - It will look like: `1234~aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890`

## Step 3: Set Up Environment Variables

1. **Create or edit a `.env` file** in the project root

2. **Add your Canvas credentials:**
   ```env
   # Canvas LMS Configuration
   CANVAS_BASE_URL=https://your-school.instructure.com
   CANVAS_ACCESS_TOKEN=your-access-token-here
   ```

   Replace:
   - `https://your-school.instructure.com` with your actual Canvas URL (no trailing slash)
   - `your-access-token-here` with the token you generated in Step 2

3. **Save the file**

## Step 4: Start the Canvas Backend Server

The app uses a backend server to connect to Canvas. Start it with:

```bash
npm run dev:canvas
```

Or start all servers together (Calendar + Canvas + Frontend):
```bash
npm run dev:all
```

You should see:
```
Canvas LMS MCP Server running on http://localhost:3001
MCP endpoint: http://localhost:3001/mcp
```

## Step 5: Verify Connection

1. **Start the frontend app** (if not using `dev:all`):
   ```bash
   npm run dev
   ```

2. **Check the health endpoint:**
   Visit: `http://localhost:3001/health`
   
   You should see:
   ```json
   {
     "status": "ok",
     "configured": true,
     "baseUrl": "https://your-school.instructure.com",
     "hasToken": true
   }
   ```

3. **Open the app** at `http://localhost:5173`

4. **Navigate to the Canvas Assignments section** - your assignments should appear automatically!

## Step 6: Verify Assignments Are Loading

1. **Open the Timeline View** or scroll to the "Canvas Assignments" section
2. **Your assignments should appear** with:
   - Assignment titles
   - Course names
   - Due dates
   - Progress status
   - Priority levels (based on due date proximity)

## Troubleshooting

### "Canvas not configured"
- Make sure your `.env` file exists in the project root
- Check that `CANVAS_BASE_URL` and `CANVAS_ACCESS_TOKEN` are set correctly
- Restart the Canvas server after adding environment variables

### "Failed to connect to server"
- Make sure the Canvas server is running on port 3001
- Check that port 3001 is not being used by another application
- Verify the server started without errors

### "Canvas API error: 401 Unauthorized"
- Your access token may be invalid or expired
- Generate a new token in Canvas and update your `.env` file
- Make sure you copied the entire token (they're long!)

### "Canvas API error: 404 Not Found"
- Check that your `CANVAS_BASE_URL` is correct
- Make sure there's no trailing slash in the URL
- Verify you can access Canvas in your browser at that URL

### "No assignments showing"
- Check that you have active assignments in Canvas
- Verify you're enrolled in courses
- Check browser console for error messages
- Try the health endpoint to verify configuration

### Server won't start
- Check that Node.js version is v18 or higher: `node --version`
- Make sure all dependencies are installed: `npm install`
- Check that port 3001 is available

### Assignments not updating
- The app fetches assignments when it connects to the MCP server
- Try refreshing the page
- Check that the Canvas server is still running

## How It Works

The app uses a **backend MCP (Model Context Protocol) server** that:
1. Connects to Canvas LMS API using your access token
2. Fetches your courses and assignments
3. Exposes Canvas data as MCP tools
4. The frontend connects to this server via HTTP proxy
5. Your assignments are displayed in the AssignmentGrid component

## Available MCP Tools

Once connected, the Canvas MCP server provides these tools:

- **`list_courses`** - List all courses you're enrolled in
- **`list_assignments`** - List assignments for a specific course
- **`get_assignment`** - Get details for a specific assignment
- **`list_user_assignments`** - List all assignments across all courses (used by the app)
- **`get_user_profile`** - Get your Canvas profile information

## Security Notes

- **Never commit your `.env` file** to git (it's already in `.gitignore`)
- **Keep your access token secure** - treat it like a password
- **Regenerate tokens** if you suspect they've been compromised
- **Set expiration dates** on tokens for better security
- The backend server stores tokens in environment variables (not in code)

## Token Expiration

- Tokens can be set to expire or never expire
- If your token expires, you'll need to generate a new one
- Update your `.env` file with the new token and restart the server

## Next Steps

Once connected, you can:
- View all your Canvas assignments in the app
- See assignments automatically prioritized by due date
- Schedule study time for assignments directly to your calendar
- Get AI recommendations based on your assignment deadlines

## Example .env Configuration

```env
# Google Calendar (existing)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# Canvas LMS (new)
CANVAS_BASE_URL=https://columbia.instructure.com
CANVAS_ACCESS_TOKEN=1234~aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
```

---

**Need help?** Check the other documentation files:
- `HOW_TO_CONNECT_GOOGLE_CALENDAR.md` - Google Calendar setup
- `GOOGLE_CALENDAR_MCP_SETUP.md` - Detailed MCP setup
