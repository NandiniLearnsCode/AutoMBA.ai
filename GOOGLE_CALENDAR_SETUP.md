# Google Calendar Integration Setup

## Overview

Your app is now configured to connect to your personal Google Calendar using OAuth 2.0 authentication.

## What's Been Set Up

1. ✅ **Credentials File** - `calendarcredentials.json` added to `.gitignore` (won't be committed)
2. ✅ **Google Calendar Service** - Created `src/services/googleCalendar.ts`
3. ✅ **TimelineView Integration** - Updated to fetch and display Google Calendar events
4. ✅ **OAuth Authentication** - Uses Google Identity Services for secure authentication

## How It Works

1. When the app loads, it automatically attempts to authenticate with Google Calendar
2. User will see a Google sign-in popup on first use
3. After authentication, calendar events for today are fetched and displayed in the timeline
4. Events are automatically categorized and formatted

## Important Notes

### Security
- The `client_secret` in your credentials file is **not used** in the frontend (for security)
- Only `client_id` is used for OAuth authentication
- This follows Google's recommended approach for frontend applications

### OAuth Configuration
Make sure in your Google Cloud Console:
1. Your OAuth 2.0 Client ID is configured as a "Web application"
2. Authorized JavaScript origins include:
   - `http://localhost:5173` (for development)
   - Your production domain (when deployed)
3. Authorized redirect URIs include:
   - `http://localhost:5173` (for development)
   - Your production domain (when deployed)

## Usage

1. Start your development server: `npm run dev`
2. Navigate to the TimelineView component
3. Click "Connect Google Calendar" if prompted
4. Sign in with your Google account
5. Grant calendar read permissions
6. Your calendar events will appear in the timeline!

## Event Categorization

Events are automatically categorized based on keywords in the title:
- **class** - Contains: class, course, lecture
- **study** - Contains: study, homework, assignment
- **workout** - Contains: gym, workout, exercise
- **networking** - Contains: coffee, networking, chat
- **recruiting** - Contains: recruiting, interview, info session
- **buffer** - Contains: buffer, travel
- **meeting** - Default for all other events

## Troubleshooting

### "Failed to load calendar credentials"
- Make sure `calendarcredentials.json` exists in the `public/` folder
- Check that the file is valid JSON

### "Failed to authenticate"
- Check that your OAuth client is configured correctly in Google Cloud Console
- Ensure authorized origins/redirects include your development URL
- Try clearing browser cache and cookies

### "No events showing"
- Check that you have events in your Google Calendar for today
- Verify you granted calendar read permissions
- Check browser console for error messages
