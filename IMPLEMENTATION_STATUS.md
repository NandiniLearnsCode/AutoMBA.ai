# Implementation Status - Chatbot & Timeline Improvements

## User Requirements
1. ✅ Chatbot should read calendar via MCP and be context-aware
2. ✅ All calendar changes should go through MCP (no popups)
3. ⏳ Timeline should have drag-and-drop to modify event times

## Current Status

### Chatbot Issues
- ❌ Using old Google Calendar API (frontend authentication)
- ❌ Not loading today's events on open (not context-aware)
- ❌ Event parsing is broken (creates wrong titles like "conflicting event is")
- ❌ Doesn't parse duration correctly ("15 mins" → defaults to 1 hour)

### Implementation Plan

**Phase 1: Chatbot MCP Migration (IN PROGRESS)**
- Replace imports with MCP hook
- Load today's events when chatbot opens
- Fix parseEventDetails to handle duration
- Use MCP create_event instead of old API

**Phase 2: Timeline Drag-and-Drop (PLANNED)**
- Add @dnd-kit library
- Implement drag handlers
- Update events via MCP (need update_event tool)

## Next Steps
1. Migrate chatbot to use `useMcpServer` hook
2. Add useEffect to load today's events on mount
3. Fix parseEventDetails function
4. Update handleApproveAction to use MCP create_event
