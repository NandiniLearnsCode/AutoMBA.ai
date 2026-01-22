// Canvas LMS MCP Server (HTTP)
// Exposes Canvas LMS API as MCP server over HTTP
// Runs on port 3001, accessible via Vite proxy

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS for Vite dev server
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Canvas API configuration
let canvasConfig = {
  baseUrl: null,
  accessToken: null,
};

// Initialize Canvas configuration
function initializeCanvas() {
  const baseUrl = process.env.CANVAS_BASE_URL;
  const accessToken = process.env.CANVAS_ACCESS_TOKEN;

  if (!baseUrl || !accessToken) {
    console.warn('Canvas credentials not found in environment variables');
    return null;
  }

  // Ensure base URL doesn't end with a slash
  canvasConfig.baseUrl = baseUrl.replace(/\/$/, '');
  canvasConfig.accessToken = accessToken;

  return canvasConfig;
}

// Initialize on startup
initializeCanvas();

// Helper function to make Canvas API requests
async function canvasRequest(endpoint, options = {}) {
  if (!canvasConfig.baseUrl || !canvasConfig.accessToken) {
    throw new Error('Canvas not configured. Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN in .env');
  }

  const url = `${canvasConfig.baseUrl}/api/v1${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${canvasConfig.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Canvas API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// MCP JSON-RPC handler
app.post('/mcp', async (req, res) => {
  try {
    const { method, params, id } = req.body;

    if (!canvasConfig.baseUrl || !canvasConfig.accessToken) {
      return res.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: 'Canvas not configured. Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN in .env file.'
        }
      });
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
            name: 'canvas-lms-mcp',
            version: '1.0.0'
          }
        };
        break;

      case 'notifications/initialized':
        result = {};
        break;

      case 'resources/list':
        // Return empty resources list (this server doesn't expose resources)
        result = {
          resources: []
        };
        break;

      case 'tools/list':
        result = {
          tools: [
            {
              name: 'list_courses',
              description: 'List all courses for the authenticated user',
              inputSchema: {
                type: 'object',
                properties: {
                  enrollment_type: {
                    type: 'string',
                    description: 'Filter by enrollment type (student, teacher, ta, observer, designer)',
                    enum: ['student', 'teacher', 'ta', 'observer', 'designer']
                  },
                  enrollment_role: {
                    type: 'string',
                    description: 'Filter by enrollment role'
                  },
                  include: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Additional information to include (syllabus_body, total_scores, etc.)'
                  }
                }
              }
            },
            {
              name: 'list_assignments',
              description: 'List assignments for a course',
              inputSchema: {
                type: 'object',
                properties: {
                  courseId: {
                    type: 'string',
                    description: 'Course ID'
                  },
                  include: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Additional information to include (submission, assignment_visibility, etc.)'
                  },
                  search_term: {
                    type: 'string',
                    description: 'Search term to filter assignments'
                  },
                  override_assignment_dates: {
                    type: 'boolean',
                    description: 'Apply assignment overrides'
                  }
                },
                required: ['courseId']
              }
            },
            {
              name: 'get_assignment',
              description: 'Get a specific assignment by ID',
              inputSchema: {
                type: 'object',
                properties: {
                  courseId: {
                    type: 'string',
                    description: 'Course ID'
                  },
                  assignmentId: {
                    type: 'string',
                    description: 'Assignment ID'
                  },
                  include: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Additional information to include (submission, assignment_visibility, etc.)'
                  }
                },
                required: ['courseId', 'assignmentId']
              }
            },
            {
              name: 'list_user_assignments',
              description: 'List all assignments across all courses for the user',
              inputSchema: {
                type: 'object',
                properties: {
                  include: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Additional information to include'
                  }
                }
              }
            },
            {
              name: 'get_user_profile',
              description: 'Get the authenticated user\'s profile information',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ]
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;

        switch (name) {
          case 'list_courses':
            const courseParams = new URLSearchParams();
            if (args?.enrollment_type) {
              courseParams.append('enrollment_type', args.enrollment_type);
            }
            if (args?.enrollment_role) {
              courseParams.append('enrollment_role', args.enrollment_role);
            }
            if (args?.include && Array.isArray(args.include)) {
              args.include.forEach(inc => courseParams.append('include[]', inc));
            }
            
            const courses = await canvasRequest(`/courses?${courseParams.toString()}`);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(courses, null, 2)
                }
              ]
            };
            break;

          case 'list_assignments':
            const assignmentParams = new URLSearchParams();
            if (args?.include && Array.isArray(args.include)) {
              args.include.forEach(inc => assignmentParams.append('include[]', inc));
            }
            if (args?.search_term) {
              assignmentParams.append('search_term', args.search_term);
            }
            if (args?.override_assignment_dates !== undefined) {
              assignmentParams.append('override_assignment_dates', args.override_assignment_dates);
            }
            
            const assignments = await canvasRequest(`/courses/${args.courseId}/assignments?${assignmentParams.toString()}`);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(assignments, null, 2)
                }
              ]
            };
            break;

          case 'get_assignment':
            const getAssignmentParams = new URLSearchParams();
            if (args?.include && Array.isArray(args.include)) {
              args.include.forEach(inc => getAssignmentParams.append('include[]', inc));
            }
            
            const assignment = await canvasRequest(`/courses/${args.courseId}/assignments/${args.assignmentId}?${getAssignmentParams.toString()}`);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(assignment, null, 2)
                }
              ]
            };
            break;

          case 'list_user_assignments':
            // Get all courses first, then get assignments for each
            const userCourses = await canvasRequest('/courses?enrollment_type=student&enrollment_state=active');
            const allAssignments = [];
            
            for (const course of userCourses) {
              try {
                const courseAssignments = await canvasRequest(`/courses/${course.id}/assignments?include[]=submission`);
                // Add course info to each assignment
                const assignmentsWithCourse = courseAssignments.map(a => ({
                  ...a,
                  course_name: course.name,
                  course_code: course.course_code,
                }));
                allAssignments.push(...assignmentsWithCourse);
              } catch (error) {
                console.warn(`Failed to fetch assignments for course ${course.id}:`, error.message);
              }
            }
            
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(allAssignments, null, 2)
                }
              ]
            };
            break;

          case 'get_user_profile':
            const profile = await canvasRequest('/users/self/profile');
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(profile, null, 2)
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

// Handle GET requests to /mcp (for testing/debugging)
app.get('/mcp', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'MCP endpoint only accepts POST requests. Use the MCP client to connect.',
    info: {
      endpoint: '/mcp',
      method: 'POST',
      contentType: 'application/json',
      healthCheck: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  const isConfigured = !!(canvasConfig.baseUrl && canvasConfig.accessToken);
  
  res.json({ 
    status: 'ok', 
    configured: isConfigured,
    baseUrl: canvasConfig.baseUrl || 'Not set',
    hasToken: !!canvasConfig.accessToken
  });
});

app.listen(PORT, () => {
  console.log(`Canvas LMS MCP Server running on http://localhost:${PORT}`);
  console.log('MCP endpoint: http://localhost:3001/mcp');
  if (!canvasConfig.baseUrl || !canvasConfig.accessToken) {
    console.warn('⚠️  Canvas not configured. Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN in .env');
  }
});
