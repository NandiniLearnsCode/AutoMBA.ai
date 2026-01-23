// Frontend Static File Server
// Serves the built Vite React app for production deployment

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Serve static files from the dist directory
const distPath = path.join(__dirname, '..', 'dist');

// Check if dist directory exists
import { existsSync } from 'fs';
if (!existsSync(distPath)) {
  console.error(`ERROR: dist directory not found at ${distPath}`);
  console.error('Please run "npm run build" first to build the frontend.');
  process.exit(1);
}

app.use(express.static(distPath));

// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Serving static files from: ${distPath}`);
});
