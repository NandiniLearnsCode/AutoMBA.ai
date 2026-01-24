# Quick Fix for redirect_uri_mismatch Error

## The Problem
Google OAuth is rejecting the request because the redirect URI doesn't match what's configured in Google Cloud Console.

## Solution (5 minutes)

### Step 1: Open Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Select your project: **gen-lang-client-0874641930**

### Step 2: Navigate to Credentials
1. Click **APIs & Services** (left sidebar)
2. Click **Credentials**
3. Find your OAuth 2.0 Client ID (starts with `38380548509-...`)
4. Click on it to **Edit**

### Step 3: Add Authorized JavaScript Origins
In the **Authorized JavaScript origins** section, add:
```
http://localhost:5173
http://127.0.0.1:5173
```

### Step 4: Add Authorized Redirect URIs
In the **Authorized redirect URIs** section, add:
```
http://localhost:5173
http://localhost:5173/
http://127.0.0.1:5173
http://127.0.0.1:5173/
```

### Step 5: Save
1. Click **Save** at the bottom
2. Wait 1-2 minutes for changes to propagate

### Step 6: Test Again
1. Clear your browser cache/cookies (or use Incognito mode)
2. Refresh your app
3. Try connecting to Google Calendar again

## Important Notes

- Make sure you're using the **exact URL** including `http://` (not `https://` for localhost)
- Include the port number `:5173`
- Both with and without trailing slash (`/`) - add both variants
- If your app is in "Testing" mode, make sure `siddhant.patra1@gmail.com` is added as a test user in OAuth consent screen

## If Still Not Working

Check the browser console for the exact redirect URI being used, and make sure it exactly matches what you added in Google Cloud Console.
