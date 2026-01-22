# Quick Fix Summary

## Critical Issues to Fix Now

1. **Event Creation Broken**: "dinner at 5PM for 15 mins" creates event with wrong title and 1 hour duration
2. **Not Context-Aware**: Chatbot doesn't load today's events when you start chatting
3. **Using Wrong API**: Still using frontend Google Calendar API instead of MCP

## Immediate Fixes Needed

### parseEventDetails Function
Current issues:
- Doesn't parse duration ("15 mins" → defaults to 1 hour)
- Title extraction is broken (extracts "conflicting event is" instead of "dinner")
- Doesn't handle "for 15 mins" pattern

Fix needed:
- Parse duration patterns: "for 15 mins", "for 30 minutes", "15 min", etc.
- Better title extraction: remove time/duration words, get meaningful title
- Handle "dinner at 5PM for 15 mins" → title: "dinner", start: 5PM, duration: 15 mins

### Chatbot Context-Awareness
- Load today's calendar events when chatbot component mounts
- Pass events to OpenAI API for context
- Currently only loads events for "schedule optimization requests"

### MCP Migration
- Replace `fetchCalendarEvents` → MCP `list_events`
- Replace `createCalendarEvent` → MCP `create_event`
- Remove `isAuthenticated`, `authenticateUser` calls
