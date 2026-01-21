# Fixing OAuth Redirect URI Mismatch Error

## Error: redirect_uri_mismatch

This error occurs when the redirect URI in your OAuth request doesn't match what's configured in Google Cloud Console.

## How to Fix

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project: `gen-lang-client-0874641930`
3. Navigate to: **APIs & Services** > **Credentials**
4. Find your OAuth 2.0 Client ID (the one starting with `38380548509-...`)
5. Click on it to edit

### Step 2: Configure Authorized JavaScript Origins

Add these URIs (both HTTP and HTTPS if available):

```
http://localhost:5173
http://127.0.0.1:5173
```

### Step 3: Configure Authorized Redirect URIs

For Google Identity Services (GIS), you typically need:

```
http://localhost:5173
http://localhost:5173/
http://127.0.0.1:5173
http://127.0.0.1:5173/
```

**OR** if using the newer Google Identity Services (which doesn't require explicit redirect URIs for some flows), you might only need:

```
http://localhost:5173
```

### Step 4: Save and Wait

1. Click **Save**
2. Wait 1-2 minutes for changes to propagate
3. Try again in your browser

## Alternative: Use Postmessage Redirect

If the above doesn't work, Google Identity Services can use `postMessage` instead of redirect URIs. The code should handle this automatically, but make sure:

1. Your OAuth consent screen is configured
2. The app is in "Testing" mode (if not published)
3. Your email (`siddhant.patra1@gmail.com`) is added as a test user

## Quick Checklist

- [ ] Added `http://localhost:5173` to Authorized JavaScript Origins
- [ ] Added `http://localhost:5173` to Authorized Redirect URIs  
- [ ] Saved the changes
- [ ] Waited 1-2 minutes
- [ ] Your email is added as a test user (if app is in Testing mode)
- [ ] Cleared browser cache/cookies (optional but recommended)

## Still Not Working?

If you're still getting the error after 2-3 minutes:
1. Clear your browser cache and cookies for localhost
2. Try in an incognito/private window
3. Check the browser console for more detailed error messages
4. Verify you're using the correct Client ID (the one from your credentials file)
