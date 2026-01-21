# Chatbot MCP Migration Plan

## Issues to Fix

1. **Calendar Not Working Properly**: Chatbot creates events with wrong names/times
2. **Not Context-Aware**: Chatbot doesn't load today's events when chatting starts
3. **Using Old API**: Chatbot uses frontend Google Calendar API instead of MCP
4. **Timeline Drag-and-Drop**: Need to add drag-and-drop functionality

## Implementation Steps

### Phase 1: Migrate Chatbot to MCP (PRIORITY)
- [x] Replace `fetchCalendarEvents` with MCP `list_events`
- [x] Replace `createCalendarEvent` with MCP `create_event`
- [x] Remove dependencies on `googleCalendar.ts` service
- [x] Load today's events when chatbot opens (context-awareness)
- [x] Fix `parseEventDetails` to properly parse "dinner at 5PM for 15 mins"

### Phase 2: Timeline Drag-and-Drop (LATER)
- [ ] Add drag-and-drop library (@dnd-kit)
- [ ] Implement drag handlers for timeline events
- [ ] Update event times via MCP (need update_event tool on server)
- [ ] Visual feedback during drag

## MCP Server Tools Available
- ✅ `list_events` - Read calendar events
- ✅ `create_event` - Create new events
- ❌ `update_event` - Not yet implemented (needed for drag-and-drop)
- ❌ `delete_event` - Not yet implemented

## Notes
- Update/delete operations will need to be added to the server later
- For now, focus on fixing create and read operations via MCP
