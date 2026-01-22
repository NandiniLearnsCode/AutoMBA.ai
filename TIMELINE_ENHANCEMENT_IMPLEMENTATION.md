# Timeline Enhancement Implementation Plan

## Requirements
1. Drag-and-drop events to change times (Day view only)
2. View toggle: Day / Week / Month
3. Week view: 7-day layout with events
4. Month view: Calendar grid with events

## Implementation Strategy

Given the complexity (~400+ lines to add), I'll implement systematically:

### Step 1: Add View State & Toggle
- Add `view` state: 'day' | 'week' | 'month'
- Add ToggleGroup in header
- Update title based on view

### Step 2: Update Data Loading
- Modify loadCalendarEvents to support date ranges
- Add currentDate state for navigation
- Load events based on view (day/week/month range)

### Step 3: Drag-and-Drop (Day View)
- Wrap day view in DndContext
- Make events draggable
- Calculate new time from Y position
- Update via MCP update_event
- Reload events after update

### Step 4: Week View
- Layout: 7 columns (Mon-Sun)
- Group events by day
- Display events in day columns
- Add navigation (prev/next week)

### Step 5: Month View
- Calendar grid layout
- Use date-fns for calendar calculations
- Show events in day cells
- Add navigation (prev/next month)

## Key Considerations

- TimeBlock needs to store original event start/end dates for updates
- Drag-and-drop only in Day view (vertical timeline)
- Week/Month views are read-only for now
- All updates go through MCP update_event tool
- Need date-fns for calendar calculations
