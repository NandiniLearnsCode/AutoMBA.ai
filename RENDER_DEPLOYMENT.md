# Render Deployment Guide

This guide will help you deploy both the frontend and backend of AutoMBA.ai to Render.

## Prerequisites

- A Render account (sign up at https://render.com)
- A GitHub repository with your code
- Google OAuth credentials (Client ID and Client Secret)

## Step 1: Deploy Backend Service

1. Go to your Render dashboard and click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the backend service:
   - **Name**: utomba-backend (or your preferred name)
   - **Environment**: Node
   - **Build Command**: 
pm install
   - **Start Command**: 
pm start
   - **Root Directory**: Leave empty (or set to root if needed)

4. Set the following environment variables in Render:
   - NODE_ENV = production
   - PORT = 10000 (Render will override this, but set it as default)
   - GOOGLE_CLIENT_ID = Your Google OAuth Client ID
   - GOOGLE_CLIENT_SECRET = Your Google OAuth Client Secret
   - GOOGLE_REDIRECT_URI = https://your-backend-service-name.onrender.com/oauth2callback
   - ALLOWED_ORIGINS = https://your-frontend-service-name.onrender.com (comma-separated if multiple)
   - BACKEND_URL = https://your-backend-service-name.onrender.com (optional, will auto-detect)

5. Click **"Create Web Service"**

6. **Important**: After deployment, note your backend service URL (e.g., https://automba-backend-xxxx.onrender.com)

## Step 2: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add your Render backend URL to **Authorized redirect URIs**:
   - https://your-backend-service-name.onrender.com/oauth2callback
5. Save the changes

## Step 3: Deploy Frontend Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect the same GitHub repository
3. Configure the frontend service:
   - **Name**: utomba-frontend (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:frontend`
   - **Root Directory**: Leave empty (or set to root if needed)

4. Set the following environment variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render will override this, but set it as default)
   - `VITE_CALENDAR_MCP_URL` = `https://your-backend-service-name.onrender.com/mcp`
   - `VITE_GOOGLE_MAPS_API_KEY` = Your Google Maps API key (if using Maps features)

5. Click **"Create Web Service"**

**Note**: The frontend server automatically handles SPA routing (serves `index.html` for all routes), which fixes the "Cannot GET /" error.

## Step 4: Update Frontend Environment Variable

After the backend is deployed, update the frontend's VITE_CALENDAR_MCP_URL environment variable:
1. Go to your frontend service in Render
2. Navigate to **Environment** tab
3. Update VITE_CALENDAR_MCP_URL to match your backend URL:
   - Value: https://your-backend-service-name.onrender.com/mcp
4. Save and redeploy

## Step 5: Verify Deployment

1. **Backend Health Check**: Visit https://your-backend-service-name.onrender.com/health
   - Should return JSON with status: "ok"

2. **Frontend**: Visit your frontend URL
   - Should load the application
   - Google Calendar features should connect to the backend

3. **OAuth Flow**: 
   - Click on Google Calendar authentication
   - Should redirect to Google OAuth
   - After authorization, should redirect back to your backend callback URL

## Troubleshooting

### Backend Issues

- **Port Error**: Render automatically sets PORT, but ensure your code uses process.env.PORT
- **CORS Errors**: Make sure ALLOWED_ORIGINS includes your frontend URL
- **OAuth Errors**: Verify GOOGLE_REDIRECT_URI matches exactly what's in Google Console

### Frontend Issues

- **Cannot GET /** or **White Screen**: The frontend server automatically handles SPA routing. Ensure `npm run start:frontend` is used as the start command.
- **Cannot Connect to Backend**: Check VITE_CALENDAR_MCP_URL is set correctly
- **Build Failures**: Ensure all dependencies are in package.json (not just devDependencies)
- **404 Errors**: The frontend server serves `index.html` for all routes, so this should not occur

### Common Environment Variable Mistakes

- Missing https:// in URLs
- Trailing slashes in URLs (should be /mcp not /mcp/)
- Wrong backend URL in frontend environment variable

## Using render.yaml (Alternative Method)

If you prefer using 
ender.yaml for infrastructure as code:

1. The 
ender.yaml file is already created in your repository
2. In Render dashboard, go to **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will automatically detect and use 
ender.yaml
5. You'll still need to set environment variables manually in Render dashboard

## Notes

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid plan for always-on services
- Backend tokens are stored in memory and will be lost on restart
- For production, consider implementing persistent token storage (database)

## Support

For Render-specific issues, check:
- Render Documentation: https://render.com/docs
- Render Status: https://status.render.com

For application issues, check the logs in Render dashboard under your service's **Logs** tab.