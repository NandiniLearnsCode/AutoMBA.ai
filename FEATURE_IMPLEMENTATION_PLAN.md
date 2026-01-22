# Comprehensive Feature Implementation Plan

## Overview
This document outlines the 6 major feature enhancements requested. Given the complexity, implementation will be done systematically.

## Feature Breakdown

### 1. Global Date Synchronization ✅ (Started)
**Status:** Creating utility file
- Create `src/utils/dateUtils.ts` with `GLOBAL_TODAY = Jan 21, 2026`
- Update all components to use `getToday()` instead of `new Date()`
- Update CommandCenter to show "Wednesday, Jan 21, 2026"
- Update TimelineView header
- Update Week/Month views to highlight Wednesday as "Today"

### 2. Canvas Assignment UI Enhancements (Next)
- Add "Schedule Time" button (ghost/outline) to each active assignment card
- Define indigo color theme for study events (`bg-indigo-500`)
- Add due date progress indicator
- Add completion % progress bar (already exists, may need enhancement)

### 3. Scheduling Dialog
- Create `ScheduleAssignmentDialog` component
- Fix DialogOverlay/DialogContent with forwardRef (DONE)
- Add time picker (start time)
- Add duration slider/input (15-minute increments)
- Show read-only assignment metadata (title, course, due date)
- Add "Add to Calendar" button with gradient background

### 4. Intelligent Recommendation Engine
- Replace "conflict" logic with "buffer" logic
- Add urgency logic: `dueDate < 48h && completion < 50%`
- Create "Urgent Assignment" recommendation card
- Create "Shift Gym Session" recommendation card (for low HRV)

### 5. AI Chatbot NLP Capability
- Add intent parsing for: "Schedule", "Block time", "Study for", "Instead of"
- Map to calendar operations:
  - "Schedule [Assignment] at [Time]" → create_event
  - "Schedule [Assignment] instead of [Event]" → delete_event + create_event
- Add success toast notifications

### 6. State Handler Updates
- Update `handleAcceptSuggestion` to:
  - Accept Assignment object
  - Create calendar entry with type: 'study'
  - Handle event shifting (find event by ID, update time by +60 minutes)

## Implementation Order

1. ✅ Global date utility (foundation)
2. ✅ Fix Dialog forwardRef issues
3. ⏳ Update components to use global date
4. ⏳ Assignment UI enhancements
5. ⏳ Scheduling dialog
6. ⏳ Recommendation engine
7. ⏳ Chatbot NLP
8. ⏳ State handlers

## Notes

- This is a very large feature set (~1000+ lines of code)
- Each feature builds on previous ones
- Testing will be important after each major piece
- Some features may require MCP server updates (e.g., delete_event tool)
