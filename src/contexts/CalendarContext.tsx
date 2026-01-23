
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { useMcpServer } from '@/hooks/useMcpServer';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface CalendarEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
}

interface ParsedEvent {
  id: string;
  time: string;
  duration: number;
  title: string;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer";
  status: "completed" | "current" | "upcoming" | "suggested";
  location?: string;
  priority: "hard-block" | "flexible" | "optional";
  startDate: Date;
  endDate: Date;
}

interface CalendarContextType {
  events: ParsedEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: (startDate: Date, endDate: Date) => Promise<void>;
  getEvents: (startDate: Date, endDate: Date) => ParsedEvent[];
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connected, callTool, connect } = useMcpServer('google-calendar');

  // Caching and throttling to prevent quota exceeded errors
  const lastFetchRef = useRef<{ start: string; end: string; timestamp: number } | null>(null);
  const fetchInProgressRef = useRef(false);
  const MIN_FETCH_INTERVAL = 5000; // Minimum 5 seconds between fetches for same range

  const parseMcpEvent = (event: CalendarEvent): ParsedEvent | null => {
    try {
      const startTime = event.start?.dateTime || event.start?.date;
      if (!startTime) return null;
      
      const start = new Date(startTime);
      const end = new Date(event.end?.dateTime || event.end?.date || startTime);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
      
      const now = new Date();
      let status: "completed" | "current" | "upcoming" | "suggested" = "upcoming";
      if (end < now) {
        status = "completed";
      } else if (start <= now && end >= now) {
        status = "current";
      }
      
      const summary = event.summary || 'Untitled Event';
      const lowerSummary = summary.toLowerCase();
      let type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer" = "meeting";
      
      if (lowerSummary.includes('class') || lowerSummary.includes('course') || lowerSummary.includes('lecture')) {
        type = "class";
      } else if (lowerSummary.includes('study') || lowerSummary.includes('homework') || lowerSummary.includes('assignment')) {
        type = "study";
      } else if (lowerSummary.includes('gym') || lowerSummary.includes('workout') || lowerSummary.includes('exercise')) {
        type = "workout";
      } else if (lowerSummary.includes('coffee') || lowerSummary.includes('networking') || lowerSummary.includes('chat')) {
        type = "networking";
      } else if (lowerSummary.includes('recruiting') || lowerSummary.includes('interview') || lowerSummary.includes('info session')) {
        type = "recruiting";
      } else if (lowerSummary.includes('buffer') || lowerSummary.includes('travel')) {
        type = "buffer";
      }
      
      const timeStr = start.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      return {
        id: event.id,
        time: timeStr,
        duration,
        title: summary,
        type,
        status,
        location: event.location,
        priority: "hard-block" as const,
        startDate: start,
        endDate: end,
      };
    } catch (error) {
      console.error('Error parsing MCP event:', error);
      return null;
    }
  }

  const fetchEvents = useCallback(async (startDate: Date, endDate: Date) => {
    if (!connected) {
      await connect();
      return;
    }

    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log('[CalendarContext] Fetch already in progress, skipping');
      return;
    }

    // Check if we recently fetched the same date range (throttling)
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    const now = Date.now();

    if (lastFetchRef.current) {
      const { start, end, timestamp } = lastFetchRef.current;
      if (start === startStr && end === endStr && now - timestamp < MIN_FETCH_INTERVAL) {
        console.log('[CalendarContext] Using cached data, skipping fetch');
        return;
      }
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await callTool('list_events', {
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: 250, // Reduced from 2500 to be more reasonable
      });

      // Update last fetch info
      lastFetchRef.current = { start: startStr, end: endStr, timestamp: now };

      let calendarEvents: CalendarEvent[] = [];
      if (Array.isArray(response)) {
        const textContent = response.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          try {
            calendarEvents = JSON.parse(textContent.text);
          } catch (e) {
            console.error('Error parsing calendar events:', e);
          }
        } else if (response.length > 0 && typeof response[0] === 'object' && 'id' in response[0]) {
          calendarEvents = response;
        }
      }

      const parsedEvents = calendarEvents
        .map(parseMcpEvent)
        .filter((e): e is ParsedEvent => e !== null);

      setEvents(prevEvents => {
        const newEvents = [...prevEvents];
        parsedEvents.forEach(newEvent => {
          const index = newEvents.findIndex(e => e.id === newEvent.id);
          if (index !== -1) {
            newEvents[index] = newEvent;
          } else {
            newEvents.push(newEvent);
          }
        });
        return newEvents;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calendar events');
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [connected, callTool, connect]);

  const getEvents = (startDate: Date, endDate: Date): ParsedEvent[] => {
    return events.filter(event => {
      const eventDate = event.startDate;
      return eventDate >= startDate && eventDate <= endDate;
    });
  };

  const value = {
    events,
    loading,
    error,
    fetchEvents,
    getEvents,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
