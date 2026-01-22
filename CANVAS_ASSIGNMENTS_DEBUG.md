# Canvas Assignments Debugging Guide

## Issues Found and Fixed

### 1. **Default Assignments Showing Instead of Real Data**
- **Problem:** Component started with `defaultAssignments` state, so if fetch failed, it kept showing fake data
- **Fix:** Changed initial state to empty array `[]`
- **Location:** `AssignmentGrid.tsx` line 140

### 2. **useEffect Dependency Issues**
- **Problem:** `callTool` and `connect` in dependency array could cause infinite loops or stale closures
- **Fix:** Added proper cleanup with `isMounted` flag and included memoized functions in deps
- **Location:** `AssignmentGrid.tsx` useEffect hook

### 3. **Connection Not Retrying**
- **Problem:** If connection failed, component wouldn't retry
- **Fix:** Added connection retry logic and better error handling
- **Location:** `AssignmentGrid.tsx` useEffect

### 4. **Poor Error Visibility**
- **Problem:** Errors were only in console, user couldn't see connection issues
- **Fix:** Added connection status badges and error display
- **Location:** `AssignmentGrid.tsx` render section

### 5. **No Manual Refresh**
- **Problem:** User couldn't manually trigger a refresh
- **Fix:** Added refresh button with loading state
- **Location:** `AssignmentGrid.tsx` header section

## How to Debug Canvas Assignments

### Step 1: Check Browser Console
Open DevTools (F12) and look for:
- ✅ "Fetching Canvas assignments..."
- ✅ "Found X Canvas assignments"
- ✅ "Converted X assignments to display format"
- ✅ "Setting assignments: X assignments"

If you see errors:
- ❌ "Failed to connect to Canvas" → Check server is running
- ❌ "Canvas not configured" → Check `.env` file
- ❌ "Error parsing Canvas assignments" → Check response format

### Step 2: Check Connection Status
Look at the Canvas Assignments section header:
- **Green "Connected" badge** → Server is connected
- **Yellow "Not Connected" badge** → Connection issue
- **Red error message** → Connection failed, click "Retry Connection"

### Step 3: Check Server Health
Visit in browser:
- Canvas: `http://localhost:3001/health`
- Should show: `{"status":"ok","configured":true,...}`

### Step 4: Check Server Logs
Look at the terminal running `npm run dev:canvas`:
- Should see: "Canvas LMS MCP Server running"
- Should NOT see: "Canvas credentials not found"

### Step 5: Test MCP Connection
In browser console, try:
```javascript
// Check if Canvas server is accessible
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(console.log)
```

## Common Issues

### Issue: "No assignments found" but you have assignments in Canvas
**Possible causes:**
1. Canvas server not running → Start with `npm run dev:canvas`
2. Wrong Canvas URL in `.env` → Check `CANVAS_BASE_URL`
3. Invalid access token → Generate new token in Canvas
4. No active enrollments → Check you're enrolled in courses
5. Assignments are in past → Only active/future assignments shown

### Issue: "Not Connected" badge showing
**Possible causes:**
1. Canvas server not running
2. Port 3001 in use by another app
3. CORS error → Check server CORS config
4. Network error → Check firewall/antivirus

### Issue: Console shows "Found 0 Canvas assignments"
**Possible causes:**
1. No assignments in Canvas
2. Assignments are in completed/past courses
3. API token doesn't have right permissions
4. Canvas API returning empty array

## Response Format

The Canvas MCP server returns data in this format:
```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"id\":123,\"name\":\"Assignment Name\",...}]"
    }
  ]
}
```

The frontend parses this by:
1. Finding the `text` content item
2. Parsing the JSON string
3. Converting each assignment to app format
4. Filtering out invalid assignments

## Debugging Checklist

- [ ] Canvas server running (`npm run dev:canvas`)
- [ ] `.env` file has `CANVAS_BASE_URL` and `CANVAS_ACCESS_TOKEN`
- [ ] Health endpoint shows `configured: true`
- [ ] Browser console shows connection logs
- [ ] "Connected" badge is green
- [ ] Console shows "Found X Canvas assignments"
- [ ] Assignments appear in the UI

## Manual Test

To manually test the Canvas connection:

1. **Open browser console (F12)**

2. **Check if server is running:**
   ```javascript
   fetch('http://localhost:3001/health').then(r => r.json()).then(console.log)
   ```

3. **Test MCP connection:**
   ```javascript
   fetch('http://localhost:3001/mcp', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       jsonrpc: '2.0',
       id: 1,
       method: 'tools/list',
       params: {}
     })
   })
   .then(r => r.json())
   .then(console.log)
   ```

4. **Test fetching assignments:**
   ```javascript
   fetch('http://localhost:3001/mcp', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       jsonrpc: '2.0',
       id: 2,
       method: 'tools/call',
       params: {
         name: 'list_user_assignments',
         arguments: {}
       }
     })
   })
   .then(r => r.json())
   .then(console.log)
   ```

## Next Steps if Still Not Working

1. Check browser console for specific error messages
2. Check server terminal for errors
3. Verify Canvas credentials are correct
4. Test Canvas API directly (outside the app)
5. Check Canvas API documentation for your instance
