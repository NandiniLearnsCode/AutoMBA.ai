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
              name: 'list_user_course_items',
              description: 'List all assignments, announcements, and quizzes across all courses for the user',
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
              name: 'list_announcements',
              description: 'List announcements for a course',
              inputSchema: {
                type: 'object',
                properties: {
                  courseId: {
                    type: 'string',
                    description: 'Course ID'
                  }
                },
                required: ['courseId']
              }
            },
            {
              name: 'list_quizzes',
              description: 'List quizzes for a course',
              inputSchema: {
                type: 'object',
                properties: {
                  courseId: {
                    type: 'string',
                    description: 'Course ID'
                  }
                },
                required: ['courseId']
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
            // Get all courses first, then get assignments for each in parallel
            const startTime = Date.now();
            console.log('📚 Fetching Canvas courses...');
            const userCourses = await canvasRequest('/courses?enrollment_type=student&enrollment_state=active');
            console.log(`✅ Found ${userCourses.length} courses, fetching assignments in parallel...`);
            
            // Fetch assignments for all courses in parallel (much faster than sequential!)
            const assignmentPromises = userCourses.map(async (course) => {
              try {
                // Optimize: Limit to 50 assignments per course and only get submission data
                // Fetch in parallel for all courses simultaneously
                const courseAssignments = await canvasRequest(
                  `/courses/${course.id}/assignments?include[]=submission&per_page=50&order_by=due_at`
                );
                // Extract only needed fields to reduce payload size (significant performance boost!)
                return courseAssignments.map(a => ({
                  id: a.id,
                  name: a.name,
                  due_at: a.due_at,
                  course_id: a.course_id,
                  course_name: course.name,
                  course_code: course.course_code,
                  submission: a.submission ? {
                    workflow_state: a.submission.workflow_state,
                    submitted_at: a.submission.submitted_at,
                    body: a.submission.body,
                  } : null,
                }));
              } catch (error) {
                console.warn(`⚠️ Failed to fetch assignments for course ${course.id} (${course.name}):`, error.message);
                return []; // Return empty array on error
              }
            });
            
            // Wait for all requests to complete in parallel
            const assignmentArrays = await Promise.all(assignmentPromises);
            const allAssignments = assignmentArrays.flat(); // Flatten array of arrays
            
            const duration = Date.now() - startTime;
            console.log(`✅ Fetched ${allAssignments.length} total assignments from ${userCourses.length} courses in ${duration}ms`);
            
            // Use compact JSON (no pretty printing) for faster serialization
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(allAssignments)
                }
              ]
            };
            break;

          case 'list_announcements':
            // Announcements are discussion topics with is_announcement=true
            const announcements = await canvasRequest(`/courses/${args.courseId}/discussion_topics?only_announcements=true&per_page=50`);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(announcements)
                }
              ]
            };
            break;

          case 'list_quizzes':
            const quizzes = await canvasRequest(`/courses/${args.courseId}/quizzes?per_page=50`);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(quizzes)
                }
              ]
            };
            break;

          case 'list_user_course_items':
            // Get all assignments, announcements, and quizzes across all courses
            const itemsStartTime = Date.now();
            console.log('📚 Fetching Canvas courses for all items...');
            const userCoursesForItems = await canvasRequest('/courses?enrollment_type=student&enrollment_state=active');
            console.log(`✅ Found ${userCoursesForItems.length} courses, fetching assignments, announcements, and quizzes in parallel...`);
            
            // Fetch all items for all courses in parallel
            const allItemsPromises = userCoursesForItems.map(async (course) => {
              try {
                const [assignments, announcements, quizzes] = await Promise.all([
                  // Assignments - increased limit to get more items
                  canvasRequest(`/courses/${course.id}/assignments?include[]=submission&per_page=100&order_by=due_at`).catch(() => []),
                  // Announcements (discussion topics with is_announcement=true) - increased limit
                  canvasRequest(`/courses/${course.id}/discussion_topics?only_announcements=true&per_page=100`).catch(() => []),
                  // Quizzes - increased limit
                  canvasRequest(`/courses/${course.id}/quizzes?per_page=100`).catch(() => [])
                ]);
                
                // Format assignments
                const formattedAssignments = assignments.map(a => ({
                  type: 'assignment',
                  id: a.id,
                  name: a.name,
                  due_at: a.due_at,
                  course_id: a.course_id,
                  course_name: course.name,
                  course_code: course.course_code,
                  submission: a.submission ? {
                    workflow_state: a.submission.workflow_state,
                    submitted_at: a.submission.submitted_at,
                    body: a.submission.body,
                  } : null,
                }));
                
                // Format announcements
                const formattedAnnouncements = announcements.map(a => ({
                  type: 'announcement',
                  id: a.id,
                  name: a.title,
                  posted_at: a.posted_at,
                  created_at: a.created_at,
                  course_id: course.id,
                  course_name: course.name,
                  course_code: course.course_code,
                  message: a.message,
                }));
                
                // Format quizzes
                const formattedQuizzes = quizzes.map(q => ({
                  type: 'quiz',
                  id: q.id,
                  name: q.title,
                  due_at: q.due_at,
                  unlock_at: q.unlock_at,
                  lock_at: q.lock_at,
                  course_id: course.id,
                  course_name: course.name,
                  course_code: course.course_code,
                  points_possible: q.points_possible,
                  question_count: q.question_count,
                }));
                
                return [...formattedAssignments, ...formattedAnnouncements, ...formattedQuizzes];
              } catch (error) {
                console.warn(`⚠️ Failed to fetch items for course ${course.id} (${course.name}):`, error.message);
                return [];
              }
            });
            
            // Wait for all requests to complete
            const allItemsArrays = await Promise.all(allItemsPromises);
            const allItems = allItemsArrays.flat();
            
            const itemsDuration = Date.now() - itemsStartTime;
            const assignmentsCount = allItems.filter(i => i.type === 'assignment').length;
            const announcementsCount = allItems.filter(i => i.type === 'announcement').length;
            const quizzesCount = allItems.filter(i => i.type === 'quiz').length;
            console.log(`✅ Fetched ${assignmentsCount} assignments, ${announcementsCount} announcements, ${quizzesCount} quizzes from ${userCoursesForItems.length} courses in ${itemsDuration}ms`);
            
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(allItems)
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
