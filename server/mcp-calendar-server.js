// Google Calendar MCP Server (HTTP)
// Exposes Google Calendar API as MCP server over HTTP
// Runs on port 3000, accessible via Vite proxy

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Store OAuth2 client (will be initialized with credentials)
let oauth2Client = null;
let calendar = null;

// Initialize OAuth2 client with credentials
function initializeOAuth2() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

  if (!clientId || !clientSecret) {
    console.warn('Google OAuth credentials not found in environment variables');
    return null;
  }

  oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return oauth2Client;
}

// Initialize on startup
initializeOAuth2();

// MCP JSON-RPC handler
app.post('/mcp', async (req, res) => {
  try {
    const { method, params, id } = req.body;

    if (!oauth2Client || !calendar) {
      return res.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: 'OAuth2 client not initialized. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
        }
      });
    }

    // Allow initialize and notifications/initialized without authentication
    if (method === 'initialize' || method === 'notifications/initialized' || method === 'tools/list') {
      // These methods don't require authentication
    } else if (method === 'tools/call') {
      // Check authentication for tool calls
      if (!oauth2Client.credentials || (!oauth2Client.credentials.access_token && !oauth2Client.credentials.refresh_token)) {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32001,
            message: 'OAuth2 not authenticated. Please visit /auth/url to authenticate first.'
          }
        });
      }
    }

    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'google-calendar-mcp',
            version: '1.0.0'
          }
        };
        break;

      case 'notifications/initialized':
        // Acknowledge initialization notification
        result = {};
        break;

      case 'tools/list':
        result = {
          tools: [
            {
              name: 'list_calendars',
              description: 'List all calendars available to the user',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'list_events',
              description: 'List events from a calendar',
              inputSchema: {
                type: 'object',
                properties: {
                  calendarId: {
                    type: 'string',
                    description: 'Calendar ID (default: primary)',
                    default: 'primary'
                  },
                  timeMin: {
                    type: 'string',
                    description: 'Start time (ISO 8601)'
                  },
                  timeMax: {
                    type: 'string',
                    description: 'End time (ISO 8601)'
                  },
                  maxResults: {
                    type: 'number',
                    description: 'Maximum number of events',
                    default: 250
                  }
                }
              }
            },
            {
              name: 'get_event',
              description: 'Get a specific event by ID',
              inputSchema: {
                type: 'object',
                properties: {
                  calendarId: {
                    type: 'string',
                    default: 'primary'
                  },
                  eventId: {
                    type: 'string',
                    description: 'Event ID'
                  }
                },
                required: ['eventId']
              }
            },
            {
              name: 'create_event',
              description: 'Create a new calendar event',
              inputSchema: {
                type: 'object',
                properties: {
                  calendarId: {
                    type: 'string',
                    default: 'primary'
                  },
                  summary: { type: 'string' },
                  description: { type: 'string' },
                  start: { type: 'object' },
                  end: { type: 'object' },
                  location: { type: 'string' }
                },
                required: ['summary', 'start', 'end']
              }
            },
            {
              name: 'update_event',
              description: 'Update an existing calendar event',
              inputSchema: {
                type: 'object',
                properties: {
                  calendarId: {
                    type: 'string',
                    default: 'primary'
                  },
                  eventId: {
                    type: 'string',
                    description: 'Event ID to update'
                  },
                  summary: { type: 'string' },
                  description: { type: 'string' },
                  start: { type: 'object' },
                  end: { type: 'object' },
                  location: { type: 'string' }
                },
                required: ['eventId']
              }
            },
            {
              name: 'delete_event',
              description: 'Delete a calendar event',
              inputSchema: {
                type: 'object',
                properties: {
                  calendarId: {
                    type: 'string',
                    description: 'Calendar ID (default: primary)',
                    default: 'primary'
                  },
                  eventId: {
                    type: 'string',
                    description: 'Event ID to delete'
                  }
                },
                required: ['eventId']
              }
            }
          ]
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;

        switch (name) {
          case 'list_calendars':
            const calendarsResponse = await calendar.calendarList.list();
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(calendarsResponse.data.items || [], null, 2)
                }
              ]
            };
            break;

          case 'list_events':
            const eventsResponse = await calendar.events.list({
              calendarId: args?.calendarId || 'primary',
              timeMin: args?.timeMin || new Date().toISOString(),
              timeMax: args?.timeMax,
              maxResults: args?.maxResults || 250,
              singleEvents: true,
              orderBy: 'startTime'
            });
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(eventsResponse.data.items || [], null, 2)
                }
              ]
            };
            break;

          case 'get_event':
            const eventResponse = await calendar.events.get({
              calendarId: args?.calendarId || 'primary',
              eventId: args.eventId
            });
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(eventResponse.data, null, 2)
                }
              ]
            };
            break;

          case 'create_event':
            const createResponse = await calendar.events.insert({
              calendarId: args?.calendarId || 'primary',
              resource: {
                summary: args.summary,
                description: args.description,
                start: args.start,
                end: args.end,
                location: args.location
              }
            });
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(createResponse.data, null, 2)
                }
              ]
            };
            break;

          case 'update_event':
            // First get the existing event to preserve fields
            const existingEvent = await calendar.events.get({
              calendarId: args?.calendarId || 'primary',
              eventId: args.eventId
            });
            
            // Update only provided fields
            const updatedResource = {
              ...existingEvent.data,
              ...(args.summary !== undefined && { summary: args.summary }),
              ...(args.description !== undefined && { description: args.description }),
              ...(args.start !== undefined && { start: args.start }),
              ...(args.end !== undefined && { end: args.end }),
              ...(args.location !== undefined && { location: args.location })
            };
            
            const updateResponse = await calendar.events.update({
              calendarId: args?.calendarId || 'primary',
              eventId: args.eventId,
              resource: updatedResource
            });
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(updateResponse.data, null, 2)
                }
              ]
            };
            break;

          case 'delete_event':
            await calendar.events.delete({
              calendarId: args?.calendarId || 'primary',
              eventId: args.eventId
            });
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true, deletedEventId: args.eventId }, null, 2)
                }
              ]
            };
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    res.json({
      jsonrpc: '2.0',
      id,
      result
    });
  } catch (error) {
    console.error('MCP error:', error);
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

// OAuth2 callback endpoint
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.send('Error: No authorization code received');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Store tokens in environment for persistence (optional)
    console.log('✅ Authentication successful! Tokens received.');
    console.log('Access token expires:', tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'Never');
    
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
          <h1 style="color: green;">✅ Authentication Successful!</h1>
          <p>You can close this window and return to the app.</p>
          <p>Your Google Calendar access is now active.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error);
    res.send(`
      <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
          <h1 style="color: red;">❌ Authentication Failed</h1>
          <p>Error: ${error.message}</p>
          <p>Please try again.</p>
        </body>
      </html>
    `);
  }
});

// Get OAuth URL
app.get('/auth/url', (req, res) => {
  if (!oauth2Client) {
    return res.status(500).json({ error: 'OAuth2 client not initialized' });
  }

  const scopes = ['https://www.googleapis.com/auth/calendar'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });

  res.json({ url });
});

// Health check
app.get('/health', (req, res) => {
  const isAuthenticated = oauth2Client?.credentials &&
    (oauth2Client.credentials.access_token || oauth2Client.credentials.refresh_token);

  res.json({
    status: 'ok',
    oauth2Initialized: !!oauth2Client,
    authenticated: isAuthenticated,
    authUrl: isAuthenticated ? null : '/auth/url'
  });
});

// Serve static frontend files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes (Express 5 syntax)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MCP endpoint: /mcp`);
});
