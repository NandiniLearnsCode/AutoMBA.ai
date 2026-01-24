# Chatbot Fixes Needed - Implementation Guide

## Critical Issues

1. **Broken Event Parsing**: "dinner at 5PM for 15 mins" → creates "conflicting event is" with 1 hour duration
2. **Not Using MCP**: Still using old Google Calendar API
3. **Not Context-Aware**: Doesn't load today's events when chatting starts

## Required Changes

### 1. Fix parseEventDetails Function
- Parse duration: "for 15 mins", "for 30 minutes", etc.
- Better title extraction: remove time/duration/stop words
- Handle "dinner at 5PM for 15 mins" correctly

### 2. Migrate to MCP
- Replace imports: Remove `googleCalendar.ts` imports
- Add: `useMcpServer('google-calendar')` hook
- Replace `fetchCalendarEvents` → MCP `list_events`
- Replace `createCalendarEvent` → MCP `create_event`
- Remove `isAuthenticated`, `authenticateUser` calls

### 3. Context-Awareness
- Load today's events when component mounts
- Store events in state
- Always pass events to OpenAI API (not just for "schedule optimization requests")

### 4. Timeline Drag-and-Drop (Future)
- Requires @dnd-kit library
- Needs update_event tool on server
- Will implement after chatbot fixes

## Implementation Complexity

The NexusChatbot.tsx file is 679 lines. The changes require:
- Updating imports (10 lines)
- Adding MCP hook (1 line)
- Fixing parseEventDetails function (45 lines)
- Updating handleSendMessage to use MCP (30 lines)
- Updating handleApproveAction to use MCP (50 lines)
- Adding useEffect for context-awareness (20 lines)

Total: ~150 lines of changes across the file

## Recommendation

Given the complexity, I should implement these fixes systematically:
1. First: Fix parseEventDetails (quick win)
2. Second: Migrate to MCP (architectural improvement)
3. Third: Add context-awareness (UX improvement)
4. Fourth: Drag-and-drop (requires more work)
