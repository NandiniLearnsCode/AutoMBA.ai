# Authentication Explanation

## Why You're Seeing Authentication Multiple Times

You have **TWO separate authentication systems** in your app:

### 1. Backend MCP Server Authentication ✅
- **Location:** Server running on port 3000
- **Status:** ✅ Already authenticated
- **Purpose:** Used by MCP client in web app
- **Authentication:** Server-side OAuth (already done via `/oauth2callback`)

### 2. Frontend Google Calendar API Authentication ⚠️
- **Location:** Browser (client-side)
- **Status:** ⚠️ Separate authentication required
- **Purpose:** Used by `TimelineView` component (old integration)
- **Authentication:** Google Identity Services (client-side OAuth)
- **Warning:** Shows "Google hasn't verified this app" (normal for dev)

## The "Unverified App" Warning

**This is NORMAL for development!**

When you see:
- "Google hasn't verified this app"
- "Go to Calendar_demo (unsafe)"

**What to do:**
1. Click "Go to Calendar_demo (unsafe)" - this is safe for development
2. This warning appears because your app isn't published/verified by Google
3. It's just Google being cautious about unverified apps

## Why Two Authentication Systems?

- **Backend MCP:** Server-side authentication (already done)
- **Frontend API:** Client-side authentication (needed for TimelineView)

These are separate because:
- Backend uses server-side OAuth (more secure, tokens stored on server)
- Frontend uses Google Identity Services (runs in browser, different flow)

## Solutions

### Option 1: Use Both (Current Setup)
- Backend MCP: Already authenticated ✅
- Frontend API: Click through the warning to authenticate
- Both systems work independently

### Option 2: Use Only MCP (Recommended)
- Migrate TimelineView to use MCP instead of direct API
- Only need backend authentication (already done)
- Single authentication system
- More consistent architecture

### Option 3: Use Only Frontend API
- Keep using the current Google Calendar API integration
- No backend server needed
- Click through warning when needed

## About the Warning

The "unverified app" warning will:
- Appear each time you authenticate (in development)
- Disappear once your app is verified by Google (for production)
- Not affect functionality - you can safely click through it

## Quick Fix

**To stop seeing the warning:**
1. Click "Go to Calendar_demo (unsafe)" when it appears
2. Complete the authentication
3. The warning will appear less often after initial auth

**To remove it completely:**
- Submit your app for Google verification (only needed for production)
- Or migrate to MCP-only approach (recommended)
