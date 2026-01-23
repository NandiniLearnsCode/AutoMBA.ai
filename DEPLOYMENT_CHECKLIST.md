# Deployment Readiness Checklist

This checklist ensures your project is ready for both **local development** and **Render deployment**.

## ✅ Configuration Files

- [x] `package.json` - Has `start` script for production
- [x] `render.yaml` - Render deployment configuration
- [x] `.env.example` - Environment variable template
- [x] `.gitignore` - Excludes `.env` files
- [x] `RENDER_DEPLOYMENT.md` - Deployment guide

## ✅ Code Configuration

### Backend Server (`server/mcp-calendar-server.js`)
- [x] Dynamic URL detection (local vs production)
- [x] Uses `process.env.PORT` (Render compatible)
- [x] CORS configured for production
- [x] Environment-based base URL logic

### Frontend (`src/config/mcpServers.ts`)
- [x] Uses `VITE_CALENDAR_MCP_URL` environment variable
- [x] Falls back to `window.location.origin` for production
- [x] Local development proxy support

### Package Dependencies
- [x] `express`, `cors`, `dotenv`, `googleapis` in `dependencies` (not devDependencies)
- [x] `start` script points to backend server

## 📋 Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. **Configure `.env` for local:**
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
   - `GOOGLE_REDIRECT_URI` - `http://localhost:3000/oauth2callback`
   - `BACKEND_URL` - `http://localhost:3000` (optional)
   - `ALLOWED_ORIGINS` - `http://localhost:5173,http://localhost:3000`

4. **Run locally:**
   ```bash
   # Option 1: Run both frontend and backend
   npm run dev:all
   
   # Option 2: Run separately
   npm run dev:server  # Backend on port 3000
   npm run dev         # Frontend on port 5173
   ```

5. **Verify local setup:**
   - Frontend: http://localhost:5173
   - Backend health: http://localhost:3000/health
   - Backend auth URL: http://localhost:3000/auth/url

## 🚀 Render Deployment Setup

### Backend Service

1. **Create Web Service** in Render dashboard
2. **Settings:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000 (Render will override)
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://your-backend-name.onrender.com/oauth2callback
   ALLOWED_ORIGINS=https://your-frontend-name.onrender.com
   BACKEND_URL=https://your-backend-name.onrender.com (optional)
   ```

4. **After deployment**, note your backend URL (e.g., `https://automba-backend-xxxx.onrender.com`)

### Frontend Service

1. **Create Static Site** in Render dashboard
2. **Settings:**
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

3. **Environment Variables:**
   ```
   VITE_CALENDAR_MCP_URL=https://your-backend-name.onrender.com/mcp
   VITE_GOOGLE_MAPS_API_KEY=your-maps-key (optional)
   ```

4. **Update Google OAuth:**
   - Go to Google Cloud Console
   - Add redirect URI: `https://your-backend-name.onrender.com/oauth2callback`

## 🔍 Verification Steps

### Local Development
- [ ] Backend starts on port 3000
- [ ] Frontend starts on port 5173
- [ ] Frontend can connect to backend via proxy
- [ ] Health endpoint returns: `http://localhost:3000/health`
- [ ] OAuth flow works locally

### Render Deployment
- [ ] Backend service deploys successfully
- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend builds successfully
- [ ] Frontend connects to backend
- [ ] OAuth redirect URI configured in Google Console
- [ ] OAuth flow works in production

## 🐛 Common Issues

### Backend won't start
- Check `package.json` has `start` script
- Verify `express`, `cors`, `dotenv`, `googleapis` are in `dependencies`
- Check logs in Render dashboard

### CORS errors
- Verify `ALLOWED_ORIGINS` includes frontend URL
- Check backend CORS configuration

### OAuth errors
- Verify `GOOGLE_REDIRECT_URI` matches exactly in Google Console
- Check redirect URI has no trailing slash
- Ensure redirect URI is added to Google OAuth authorized URIs

### Frontend can't connect to backend
- Verify `VITE_CALENDAR_MCP_URL` is set correctly
- Check backend URL is accessible (no CORS errors)
- Ensure backend service is running (not spun down)

## 📝 Notes

- **Render Free Tier**: Services spin down after 15 min inactivity
- **First Request**: May take 30-60 seconds after spin-down
- **Environment Variables**: Must be set in Render dashboard (not in code)
- **Token Storage**: Currently in-memory (lost on restart) - consider database for production
