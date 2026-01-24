# Fix OAuth Redirect URI Mismatch Error

## Error
```
Error 400: redirect_uri_mismatch
```

This means the redirect URI in your Google Cloud Console doesn't match what the server is using.

## Solution

You need to add the redirect URI to your Google Cloud Console OAuth credentials.

### Steps:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials

2. **Find Your OAuth 2.0 Client ID:**
   - Look for: `38380548509-npg537eeeei766nnf5etaku32a1086ul.apps.googleusercontent.com`
   - Click on it to edit

3. **Add Authorized Redirect URIs:**
   - Scroll down to "Authorized redirect URIs"
   - Click "+ ADD URI"
   - Add this **exact** URI:
     ```
     http://localhost:3000/oauth2callback
     ```
   - ⚠️ **Important:** It must match exactly (including http://, no trailing slash)

4. **Save:**
   - Click "SAVE" at the bottom

5. **Wait a few seconds** for the changes to propagate

6. **Try again:**
   - Visit: http://localhost:3000/auth/url
   - Copy the authentication URL
   - Open it in your browser
   - Complete the OAuth flow

## Redirect URI Details

The server uses this redirect URI:
- **URI:** `http://localhost:3000/oauth2callback`
- **Protocol:** `http://` (not https)
- **Host:** `localhost:3000`
- **Path:** `/oauth2callback`
- **No trailing slash**

## Quick Checklist

- [ ] Redirect URI added in Google Cloud Console
- [ ] URI matches exactly: `http://localhost:3000/oauth2callback`
- [ ] Changes saved in Google Cloud Console
- [ ] Waited a few seconds after saving
- [ ] Tried authentication again

## Alternative: Check Current Redirect URIs

If you want to see what redirect URIs are currently configured:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Scroll to "Authorized redirect URIs"
4. Verify `http://localhost:3000/oauth2callback` is listed

If it's not there, add it!
