// Recommendation Engine Utilities
// Handles buffer management and urgency detection for assignments

import { getToday } from "./dateUtils";
import { differenceInHours, parse } from "date-fns";

export interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  progress: number;
  estimatedTime: string;
  status: "not-started" | "in-progress" | "completed";
}

export interface CalendarEvent {
  id: string;
  start: Date;
  end: Date;
  title: string;
  type: string;
}

export interface Recommendation {
  id: string;
  type: "buffer" | "urgency" | "shift";
  title: string;
  description: string;
  assignment?: Assignment;
  eventId?: string;
  eventTitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Calculate buffer time (in minutes) between two events
 * Returns 0 if events overlap, negative if there's a gap, positive if they're back-to-back
 */
export function calculateBuffer(event1End: Date, event2Start: Date): number {
  return Math.round((event2Start.getTime() - event1End.getTime()) / (1000 * 60));
}

/**
 * Check if two events have 0 minutes buffer (tight schedule)
 */
export function hasTightSchedule(event1End: Date, event2Start: Date): boolean {
  const buffer = calculateBuffer(event1End, event2Start);
  return buffer === 0;
}

/**
 * Parse assignment due date string (e.g., "Jan 22, 11:59 PM") to Date
 */
export function parseDueDate(dueDateStr: string): Date {
  try {
    // Try parsing common formats
    // Format: "Jan 22, 11:59 PM" or "Jan 22, 2026, 11:59 PM"
    const today = getToday();
    const year = today.getFullYear();
    
    // Parse format like "Jan 22, 11:59 PM"
    const parsed = parse(dueDateStr, "MMM d, h:mm a", new Date());
    
    // If year is invalid, set to current year
    if (isNaN(parsed.getTime())) {
      // Try without time
      const parsedDate = parse(dueDateStr, "MMM d", new Date());
      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setFullYear(year);
        return parsedDate;
      }
      // Fallback: return today + 1 day if parsing fails
      return new Date(year, today.getMonth(), today.getDate() + 1);
    }
    
    parsed.setFullYear(year);
    return parsed;
  } catch (error) {
    console.error("Error parsing due date:", error);
    // Fallback: return tomorrow
    const today = getToday();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  }
}

/**
 * Check if assignment is urgent (dueDate < 48h && completion < 50%)
 */
export function isUrgentAssignment(assignment: Assignment): boolean {
  if (assignment.status === "completed") return false;
  if (assignment.progress >= 50) return false;
  
  const dueDate = parseDueDate(assignment.dueDate);
  const today = getToday();
  const hoursUntilDue = differenceInHours(dueDate, today);
  
  return hoursUntilDue < 48 && hoursUntilDue > 0;
}

/**
 * Generate urgent assignment recommendation
 */
export function generateUrgentRecommendation(assignment: Assignment): Recommendation {
  return {
    id: `urgent-${assignment.id}`,
    type: "urgency",
    title: "Urgent Assignment Due Tomorrow",
    description: `${assignment.title} (${assignment.course}) is due in less than 48 hours and is only ${assignment.progress}% complete. Schedule 2 hours to complete it.`,
    assignment,
    action: {
      label: "Schedule 2 Hours",
      onClick: () => {
        // This will be handled by handleAcceptSuggestion
      },
    },
  };
}

/**
 * Generate buffer warning recommendation (0 minutes between events)
 */
export function generateBufferWarning(event1: CalendarEvent, event2: CalendarEvent): Recommendation {
  return {
    id: `buffer-${event1.id}-${event2.id}`,
    type: "buffer",
    title: "Tight Schedule: No Buffer Time",
    description: `${event1.title} ends exactly when ${event2.title} starts. Consider adding buffer time for transitions.`,
    eventId: event1.id,
    eventTitle: event1.title,
  };
}

/**
 * Generate shift recommendation for gym session (low HRV scenario)
 */
export function generateGymShiftRecommendation(
  gymEvent: CalendarEvent,
  conflictingEvent: CalendarEvent,
  hoursToShift: number = 1
): Recommendation {
  const newStartTime = new Date(gymEvent.start);
  newStartTime.setHours(newStartTime.getHours() + hoursToShift);
  const newEndTime = new Date(gymEvent.end);
  newEndTime.setHours(newEndTime.getHours() + hoursToShift);
  
  return {
    id: `shift-${gymEvent.id}`,
    type: "shift",
    title: "Shift Gym Session",
    description: `Low HRV detected. Move the ${gymEvent.title} from ${formatTime(gymEvent.start)} to ${formatTime(newStartTime)} to create a recovery buffer after ${conflictingEvent.title}.`,
    eventId: gymEvent.id,
    eventTitle: gymEvent.title,
    action: {
      label: "Shift to 2:00 PM",
      onClick: () => {
        // This will be handled by handleAcceptSuggestion
      },
    },
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
