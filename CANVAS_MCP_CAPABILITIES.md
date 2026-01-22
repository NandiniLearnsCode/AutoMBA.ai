# Canvas MCP Server - Available Data & Capabilities

## Currently Available Tools

Your Canvas MCP server currently provides these tools:

### 1. **`list_courses`**
**What it pulls:**
- All courses you're enrolled in
- Course metadata (name, code, ID, term, etc.)
- Enrollment information

**Parameters:**
- `enrollment_type` - Filter by role (student, teacher, ta, observer, designer)
- `enrollment_role` - Filter by specific role
- `include` - Additional data (syllabus_body, total_scores, etc.)

**Returns:** Array of course objects with:
- `id`, `name`, `course_code`
- `enrollment_term_id`, `start_at`, `end_at`
- `workflow_state`
- And more course metadata

---

### 2. **`list_assignments`**
**What it pulls:**
- All assignments for a specific course
- Assignment details (name, description, points, due dates)
- Submission information (if included)

**Parameters:**
- `courseId` (required) - The course ID
- `include` - Additional data (submission, assignment_visibility, etc.)
- `search_term` - Search/filter assignments by name
- `override_assignment_dates` - Apply assignment overrides

**Returns:** Array of assignment objects with:
- `id`, `name`, `description`
- `due_at`, `unlock_at`, `lock_at`
- `points_possible`, `grading_type`
- `submission_types`
- `submission` (if included) - Your submission status

---

### 3. **`get_assignment`**
**What it pulls:**
- Detailed information for a specific assignment
- Full assignment description and requirements
- Submission details

**Parameters:**
- `courseId` (required) - The course ID
- `assignmentId` (required) - The assignment ID
- `include` - Additional data (submission, assignment_visibility, etc.)

**Returns:** Single assignment object with complete details

---

### 4. **`list_user_assignments`**
**What it pulls:**
- **All assignments across ALL your courses** (most useful!)
- Fetches in parallel for performance
- Includes submission status for each assignment

**Parameters:**
- `include` - Additional information to include

**Returns:** Array of assignments from all courses with:
- `id`, `name`, `due_at`
- `course_id`, `course_name`, `course_code`
- `submission` - Your submission status (workflow_state, submitted_at, body)

**Performance:** Fetches all courses in parallel (fast!)

---

### 5. **`get_user_profile`**
**What it pulls:**
- Your Canvas user profile information
- Name, email, avatar URL
- User ID and login information

**Parameters:** None

**Returns:** User profile object with:
- `id`, `name`, `short_name`
- `sortable_name`, `email`
- `avatar_url`, `locale`
- `time_zone`

---

## What Data is Available from Each Tool

### From Assignments:
- ✅ Assignment name/title
- ✅ Due dates (`due_at`, `unlock_at`, `lock_at`)
- ✅ Points possible
- ✅ Description/instructions
- ✅ Submission types (online, file upload, etc.)
- ✅ Your submission status (submitted, graded, unsubmitted)
- ✅ Submission date/time
- ✅ Course information (name, code)

### From Courses:
- ✅ Course name and code
- ✅ Course ID
- ✅ Term information
- ✅ Start/end dates
- ✅ Enrollment status
- ✅ Syllabus (if included)

### From User Profile:
- ✅ Your name and email
- ✅ Avatar URL
- ✅ Timezone and locale

---

## What Could Be Added (Not Currently Implemented)

The Canvas API supports many more endpoints that could be added:

### Potential Additional Tools:

1. **Announcements**
   - `/courses/:id/discussion_topics?only_announcements=true`
   - Course announcements and messages

2. **Quizzes**
   - `/courses/:id/quizzes`
   - Quiz information, due dates, attempts

3. **Discussions**
   - `/courses/:id/discussion_topics`
   - Course discussions and forums

4. **Grades**
   - `/courses/:id/enrollments`
   - Current grades and scores

5. **Modules**
   - `/courses/:id/modules`
   - Course modules and content structure

6. **Files**
   - `/courses/:id/files`
   - Course files and documents

7. **Calendar Events**
   - `/calendar_events`
   - Canvas calendar events

8. **Submissions**
   - `/courses/:id/assignments/:id/submissions`
   - Detailed submission information

9. **Grades**
   - `/courses/:id/students/submissions`
   - Grade information

10. **To-Do Items**
    - `/users/self/todo`
    - Your Canvas to-do list

---

## Current Limitations

- **No announcements** - Not currently implemented
- **No quizzes** - Not currently implemented  
- **No discussions** - Not currently implemented
- **No grades** - Not currently implemented
- **No calendar events** - Not currently implemented
- **No modules** - Not currently implemented

---

## How to Use the Tools

### Example: Get All Your Assignments
```javascript
const response = await callTool('list_user_assignments', {});
// Returns all assignments from all courses
```

### Example: Get Courses
```javascript
const response = await callTool('list_courses', {
  enrollment_type: 'student',
  enrollment_state: 'active'
});
// Returns your active student courses
```

### Example: Get Assignments for One Course
```javascript
const response = await callTool('list_assignments', {
  courseId: '12345',
  include: ['submission']
});
// Returns assignments for course 12345
```

---

## Data Format

All tools return data in MCP format:
```json
{
  "content": [
    {
      "type": "text",
      "text": "[{...assignment data...}]"
    }
  ]
}
```

The frontend parses this by:
1. Finding the `text` content item
2. Parsing the JSON string
3. Using the data

---

## Performance Notes

- **`list_user_assignments`** fetches in parallel (fast!)
- **Other tools** fetch sequentially
- **Payload optimization** - Only essential fields are sent
- **Caching** - Frontend caches for 30 seconds

---

## Next Steps

If you want to add more Canvas data:
1. Add new tool definitions to `tools/list`
2. Implement the tool handler in `tools/call`
3. Use the appropriate Canvas API endpoint
4. Update the frontend to use the new tool
