# Quick Start Guide

## Running All Servers

To start everything (Google Calendar + Canvas + Frontend):

```bash
npm run dev:all
```

This runs:
- Google Calendar MCP Server (port 3000)
- Canvas LMS MCP Server (port 3001)  
- Frontend Vite Dev Server (port 5173)

## If Terminal Gets Stuck

1. **Stop the process:**
   - Press `Ctrl + C` (may need to press twice)
   - Or close the terminal window

2. **Check if ports are in use:**
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   netstat -ano | findstr :5173
   ```

3. **Kill processes if needed:**
   ```bash
   # Find the PID from netstat, then:
   taskkill /PID <process-id> /F
   ```

4. **Restart:**
   ```bash
   npm run dev:all
   ```

## Running Servers Individually

If you prefer to run servers separately:

**Terminal 1 - Google Calendar:**
```bash
npm run dev:server
```

**Terminal 2 - Canvas:**
```bash
npm run dev:canvas
```

**Terminal 3 - Frontend:**
```bash
npm run dev
```

## Troubleshooting

### "Port already in use"
- Stop the process using that port (see above)
- Or change the port in the server files

### "Module not found"
- Run: `npm install`

### Server won't start
- Check your `.env` file has required variables
- Check Node.js version: `node --version` (should be v18+)
