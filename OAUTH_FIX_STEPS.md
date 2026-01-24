# Fix OAuth Redirect URI Mismatch - Quick Steps

## Error
```
Error 400: redirect_uri_mismatch
```

## Solution

The server is using this redirect URI: **`http://localhost:3000/oauth2callback`**

You need to add this **exact** URI to your Google Cloud Console.

### Step-by-Step:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Make sure you're in the correct project

2. **Find Your OAuth 2.0 Client ID:**
   - Look for your OAuth client (the one you're using for this app)
   - Click on it to **Edit**

3. **Add Authorized Redirect URI:**
   - Scroll down to **"Authorized redirect URIs"** section
   - Click **"+ ADD URI"**
   - Add this **exact** URI (copy-paste to avoid typos):
     ```
     http://localhost:3000/oauth2callback
     ```
   - ⚠️ **Important:** 
     - Must be `http://` (not `https://`)
     - Must include port `:3000`
     - Must be `/oauth2callback` (not `/oauth2callback/`)
     - No trailing slash

4. **Save:**
   - Click **"SAVE"** at the bottom of the page
   - Wait **1-2 minutes** for changes to propagate

5. **Try Again:**
   - Visit: `http://localhost:3000/auth/url`
   - Copy the authentication URL
   - Open it in your browser
   - Complete the OAuth flow

## Verify Your .env File

Make sure your `.env` file has:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

If `GOOGLE_REDIRECT_URI` is not set, the server defaults to `http://localhost:3000/oauth2callback`, which is correct.

## Still Not Working?

1. **Clear browser cache/cookies** for localhost
2. **Try in incognito/private window**
3. **Wait 2-3 minutes** after saving in Google Cloud Console
4. **Check the exact error** - sometimes Google shows the expected URI in the error message
