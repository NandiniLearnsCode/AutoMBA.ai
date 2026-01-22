# TimelineView Enhancements

## Features to Add

1. **Drag-and-Drop** - Allow dragging events to change their times
2. **View Toggle** - Switch between Day/Week/Month views
3. **Week View** - Show events for the current week
4. **Month View** - Show events in a calendar grid format

## Implementation Plan

### Phase 1: View Toggle & Data Loading
- Add view state: 'day' | 'week' | 'month'
- Update loadCalendarEvents to support date ranges
- Add toggle buttons in header

### Phase 2: Drag-and-Drop (Day View)
- Add @dnd-kit DndContext
- Make events draggable
- Calculate new time from drop position
- Update event via MCP update_event tool
- Reload events after update

### Phase 3: Week View
- Layout: 7 columns (one per day)
- Show events in their respective day columns
- Add navigation (prev/next week)

### Phase 4: Month View
- Calendar grid layout (like react-day-picker)
- Show events in their respective days
- Add navigation (prev/next month)

## Dependencies

- ✅ @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (installed)
- ✅ date-fns (already in package.json)
- ✅ update_event tool (added to server)

## Notes

- Drag-and-drop only works in Day view (vertical timeline)
- Week/Month views are read-only for now (can add drag later if needed)
- All updates go through MCP update_event tool
