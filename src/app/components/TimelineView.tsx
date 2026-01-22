import { useState, useEffect, useCallback } from "react";
import { Clock, Users, BookOpen, Dumbbell, Coffee, Briefcase, GraduationCap, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/app/components/ui/toggle-group";
import { useMcpServer } from "@/hooks/useMcpServer";
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth } from "date-fns";
import { getToday, isToday as isTodayGlobal } from "@/utils/dateUtils";

interface TimeBlock {
  id: string;
  time: string;
  duration: number;
  title: string;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer";
  status: "completed" | "current" | "upcoming" | "suggested";
  location?: string;
  priority: "hard-block" | "flexible" | "optional";
  // Store original dates for updates
  startDate: Date;
  endDate: Date;
}

const typeConfig = {
  class: { icon: GraduationCap, color: "bg-blue-500" },
  meeting: { icon: Users, color: "bg-purple-500" },
  study: { icon: BookOpen, color: "bg-indigo-500" }, // Indigo theme for study events
  workout: { icon: Dumbbell, color: "bg-green-500" },
  networking: { icon: Coffee, color: "bg-orange-500" },
  recruiting: { icon: Briefcase, color: "bg-red-500" },
  buffer: { icon: Clock, color: "bg-gray-400" },
};

// Google Calendar event structure from MCP server
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

// Draggable Event Component (for Day View)
function DraggableEvent({ block, index, isLast, typeConfig }: { block: TimeBlock; index: number; isLast: boolean; typeConfig: typeof typeConfig }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: block,
  });

  const config = typeConfig[block.type];
  const Icon = config.icon;
  const style = transform ? {
    transform: `translateY(${transform.y}px)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} className={`relative flex gap-4 ${!isLast ? "mb-6" : ""} ${isDragging ? "opacity-50 z-50" : ""}`}>
      {/* Time */}
      <div className="w-16 text-sm text-muted-foreground font-mono pt-1">{block.time}</div>

      {/* Icon */}
      <div className="relative z-10">
        <div
          className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center ${
            block.status === "current" ? "ring-4 ring-blue-500/20" : ""
          } ${block.status === "completed" ? "opacity-50" : ""} ${
            block.status === "suggested" ? "ring-2 ring-dashed ring-green-500/50" : ""
          }`}
        >
          <Icon className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Content - Draggable */}
      <div className="flex-1 pb-6" {...listeners} {...attributes} style={{ cursor: 'grab' }}>
        <div
          className={`rounded-lg border-l-4 border p-3 ${
            block.type === "class" ? "border-l-blue-500" :
            block.type === "meeting" ? "border-l-purple-500" :
            block.type === "study" ? "border-l-indigo-500" :
            block.type === "workout" ? "border-l-green-500" :
            block.type === "networking" ? "border-l-orange-500" :
            block.type === "recruiting" ? "border-l-red-500" :
            "border-l-gray-400"
          } ${
            block.status === "current" ? "border-blue-500 bg-blue-500/5" : ""
          } ${block.status === "completed" ? "opacity-50" : ""} ${
            block.status === "suggested" ? "border-green-500 border-dashed bg-green-500/5" : ""
          } ${isDragging ? "shadow-lg" : ""}`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm">{block.title}</h4>
            <Badge
              variant={block.priority === "hard-block" ? "default" : "outline"}
              className="text-xs shrink-0"
            >
              {block.priority === "hard-block" ? "Critical" : block.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{block.duration} min</span>
            {block.location && <span>• {block.location}</span>}
            {block.status === "current" && (
              <span className="text-blue-500 font-semibold">• In Progress</span>
            )}
            {block.status === "suggested" && (
              <span className="text-green-500 font-semibold">• Agent Suggested</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ timeBlocks, currentDate, typeConfig }: { timeBlocks: TimeBlock[]; currentDate: Date; typeConfig: typeof typeConfig }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
  
  // Group events by day
  const eventsByDay = weekDays.map(day => ({
    date: day,
    events: timeBlocks.filter(block => isSameDay(block.startDate, day))
  }));

  return (
    <div className="grid grid-cols-7 gap-2">
      {eventsByDay.map(({ date, events }) => (
        <div key={date.toISOString()} className="border rounded-lg p-2 min-h-[200px]">
          <div className={`text-xs font-semibold mb-2 ${isTodayGlobal(date) ? 'text-blue-500' : 'text-muted-foreground'}`}>
            {format(date, 'EEE')}
          </div>
          <div className={`text-sm font-bold mb-2 ${isTodayGlobal(date) ? 'text-blue-500' : ''}`}>
            {format(date, 'd')}
          </div>
          <div className="space-y-1">
            {events.map(block => {
              const config = typeConfig[block.type];
              const Icon = config.icon;
              return (
                <div
                  key={block.id}
                  className={`rounded p-1.5 text-xs ${config.color} text-white truncate cursor-pointer hover:opacity-80`}
                  title={block.title}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{block.time}</span>
                  </div>
                  <div className="truncate">{block.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Month View Component
function MonthView({ timeBlocks, currentDate, typeConfig }: { timeBlocks: TimeBlock[]; currentDate: Date; typeConfig: typeof typeConfig }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Group events by day
  const eventsByDay = new Map<string, TimeBlock[]>();
  timeBlocks.forEach(block => {
    const dateKey = format(block.startDate, 'yyyy-MM-dd');
    if (!eventsByDay.has(dateKey)) {
      eventsByDay.set(dateKey, []);
    }
    eventsByDay.get(dateKey)!.push(block);
  });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-2">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isCurrentDay = isTodayGlobal(date);
            
            return (
              <div
                key={date.toISOString()}
                className={`border rounded-lg p-1.5 min-h-[80px] ${
                  !isCurrentMonth ? 'opacity-30' : ''
                } ${isCurrentDay ? 'border-blue-500 bg-blue-50/50' : ''}`}
              >
                <div className={`text-xs font-semibold mb-1 ${isCurrentDay ? 'text-blue-500' : 'text-muted-foreground'}`}>
                  {format(date, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(block => {
                    const config = typeConfig[block.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={block.id}
                        className={`rounded px-1 py-0.5 text-[10px] ${config.color} text-white truncate`}
                        title={`${block.time} - ${block.title}`}
                      >
                        <div className="flex items-center gap-0.5">
                          <Icon className="w-2 h-2 shrink-0" />
                          <span className="truncate">{block.title}</span>
                        </div>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Parse MCP event response to TimeBlock format
function parseMcpEvent(event: CalendarEvent): TimeBlock | null {
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
    
    // Determine event type from summary/title
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
      startDate: start, // Store for drag-and-drop updates
      endDate: end, // Store for drag-and-drop updates
    };
  } catch (error) {
    console.error('Error parsing MCP event:', error);
    return null;
  }
}

export function TimelineView() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("day"); // Default to day view
  // Set to today's date (system date) - contextually aware
  const [currentDate, setCurrentDate] = useState(() => {
    const today = getToday(); // Use actual system date
    // For day view, show today. For week/month views, show the start of the period containing today
    return today;
  });
  
  // Use MCP server hook for Google Calendar
  const { connected, loading, error: mcpError, callTool, connect } = useMcpServer('google-calendar');
  
  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadCalendarEvents = useCallback(async () => {
    try {
      setError(null);
      
      // Ensure connected to MCP server (connect is idempotent)
      if (!connected && !loading) {
        console.log('[TimelineView] Connecting to MCP server...');
        await connect();
        // Connection state will update asynchronously, so we'll proceed
        // The useEffect will retry when connected becomes true
        console.log('[TimelineView] Connection initiated, will retry when connected');
        return;
      }
      
      if (!connected) {
        console.warn('[TimelineView] Not connected, skipping event load');
        return;
      }
      
      console.log('[TimelineView] Connected, fetching events...');
      
      // Calculate date range based on view
      let startDate: Date;
      let endDate: Date;
      
      // Use today as the reference point for all views to ensure contextual awareness
      const today = getToday();
      
      if (view === 'day') {
        // For day view, use the selected date (defaults to today)
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        // For week view, show the week containing the selected date (defaults to this week)
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
        startDate.setHours(0, 0, 0, 0);
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
        endDate.setHours(23, 59, 59, 999);
      } else { // month
        // For month view, show the month containing the selected date (defaults to this month)
        startDate = startOfMonth(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = endOfMonth(currentDate);
        endDate.setHours(23, 59, 59, 999);
      }
      
      // First, get all calendars (my calendars + other calendars)
      console.log('[TimelineView] Fetching all calendars...');
      let allCalendars: any[] = [];
      try {
        const calendarsResponse = await callTool('list_calendars', {});
        // Parse calendars response
        if (Array.isArray(calendarsResponse)) {
          const textContent = calendarsResponse.find((item: any) => item.type === 'text');
          if (textContent?.text) {
            allCalendars = JSON.parse(textContent.text);
          } else if (calendarsResponse.length > 0 && typeof calendarsResponse[0] === 'object' && 'id' in calendarsResponse[0]) {
            allCalendars = calendarsResponse;
          }
        } else if (calendarsResponse?.content) {
          const textContent = calendarsResponse.content.find((item: any) => item.type === 'text');
          if (textContent?.text) {
            allCalendars = JSON.parse(textContent.text);
          }
        }
        
        // Filter to only show calendars that are selected/visible
        // Google Calendar API returns accessRole and selected properties
        allCalendars = allCalendars.filter((cal: any) => {
          // Show calendars where user has access and calendar is selected/visible
          return cal.accessRole && (cal.selected !== false); // Include if selected is true or undefined
        });
        
        console.log(`[TimelineView] Found ${allCalendars.length} calendars:`, allCalendars.map((c: any) => c.summary || c.id));
      } catch (calError) {
        console.warn('[TimelineView] Could not fetch calendars, using primary only:', calError);
        // Fallback to primary calendar if list_calendars fails
        allCalendars = [{ id: 'primary', summary: 'Primary Calendar' }];
      }
      
      // Fetch events from all calendars in parallel
      console.log('[TimelineView] Fetching events from all calendars...', {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        calendarCount: allCalendars.length,
      });
      
      const eventPromises = allCalendars.map(async (cal: any) => {
        try {
          const response = await callTool('list_events', {
            calendarId: cal.id,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            maxResults: 500,
          });
          
          // Parse response
          let events: CalendarEvent[] = [];
          if (Array.isArray(response)) {
            const textContent = response.find((item: any) => item.type === 'text');
            if (textContent?.text) {
              events = JSON.parse(textContent.text);
            } else if (response.length > 0 && typeof response[0] === 'object' && 'id' in response[0]) {
              events = response as CalendarEvent[];
            }
          } else if (response?.content) {
            const textContent = response.content.find((item: any) => item.type === 'text');
            if (textContent?.text) {
              events = JSON.parse(textContent.text);
            }
          }
          
          // Add calendar info to each event
          return events.map((event: any) => ({
            ...event,
            calendarId: cal.id,
            calendarName: cal.summary || cal.id,
          }));
        } catch (err) {
          console.warn(`[TimelineView] Failed to fetch events from calendar ${cal.id} (${cal.summary}):`, err);
          return [];
        }
      });
      
      // Wait for all calendar fetches to complete
      const allEventArrays = await Promise.all(eventPromises);
      const events = allEventArrays.flat(); // Combine all events from all calendars
      
      console.log(`[TimelineView] Fetched ${events.length} total events from ${allCalendars.length} calendars`);
      
      // Parse events for the selected view (day/week/month)
      console.log('[TimelineView] Parsing', events.length, 'events');
      const parsedEvents = events
        .map(parseMcpEvent)
        .filter((event): event is TimeBlock => event !== null)
        .sort((a, b) => {
          // Sort by start date/time
          const dateCompare = a.startDate.getTime() - b.startDate.getTime();
          if (dateCompare !== 0) return dateCompare;
          // If same date, sort by time
          const timeA = a.time.split(':').map(Number);
          const timeB = b.time.split(':').map(Number);
          return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
      
      console.log('[TimelineView] Successfully parsed', parsedEvents.length, 'events from', events.length, 'raw events');
      setTimeBlocks(parsedEvents);
    } catch (err: any) {
      console.error('Error loading calendar via MCP:', err);
      setError(err.message || 'Failed to load Google Calendar events');
      setTimeBlocks([]);
    }
  }, [connected, callTool, connect, view, currentDate]);

  useEffect(() => {
    // Connect to MCP server on mount if not connected
    if (!connected && !loading) {
      console.log('[TimelineView] useEffect: Initiating connection...');
      connect();
    }
  }, [connected, loading, connect]); // Run when connection state changes

  useEffect(() => {
    // Load calendar events when connected
    if (connected && !loading) {
      console.log('[TimelineView] useEffect: Connected, loading events...');
      loadCalendarEvents();
    }
  }, [connected, loading, loadCalendarEvents]);

  const formatDateRange = () => {
    if (view === 'day') {
      return format(currentDate, 'EEEE, MMM d, yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };
  
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      if (view === 'day') {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        return newDate;
      } else if (view === 'week') {
        return direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
      } else {
        return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
      }
    });
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active.data.current || !delta) return;
    
    const block = active.data.current as TimeBlock;
    const minutesDelta = Math.round(delta.y / 2); // Adjust sensitivity (2px per minute)
    
    if (minutesDelta === 0) return;
    
    try {
      const newStart = new Date(block.startDate);
      newStart.setMinutes(newStart.getMinutes() + minutesDelta);
      const newEnd = new Date(block.endDate);
      newEnd.setMinutes(newEnd.getMinutes() + minutesDelta);
      
      await callTool('update_event', {
        calendarId: 'primary',
        eventId: block.id,
        start: {
          dateTime: newStart.toISOString(),
        },
        end: {
          dateTime: newEnd.toISOString(),
        },
      });
      
      // Reload events
      await loadCalendarEvents();
    } catch (err: any) {
      console.error('Error updating event:', err);
      setError(err.message || 'Failed to update event');
    }
  };

  // Combine loading states
  const isLoading = loading || (connected && timeBlocks.length === 0 && !error);
  
  if (isLoading && timeBlocks.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">
            {connected ? 'Loading calendar...' : 'Connecting to calendar...'}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Calendar</h3>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "day" | "week" | "month")} size="sm" variant="outline">
            <ToggleGroupItem value="day" aria-label="Day view">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Week view">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Month view">
              Month
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateDate('prev')}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const today = getToday();
              setCurrentDate(today);
              // If in week/month view, navigate to the period containing today
              if (view === 'week') {
                setCurrentDate(startOfWeek(today, { weekStartsOn: 1 }));
              } else if (view === 'month') {
                setCurrentDate(startOfMonth(today));
              } else {
                setCurrentDate(today);
              }
            }}
            className="h-7 px-2 text-xs"
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateDate('next')}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[140px] text-right">{formatDateRange()}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadCalendarEvents}
            disabled={loading || !connected}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {(error || mcpError) && !connected && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-600 mb-2">
            {mcpError || error || 'Unable to connect to Google Calendar'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={connect}
            disabled={loading}
            className="h-7 text-xs"
          >
            Connect Google Calendar
          </Button>
        </div>
      )}

      {(error || mcpError) && connected && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-600">{error || mcpError}</p>
        </div>
      )}

      {timeBlocks.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No events scheduled {view === 'day' ? 'for this day' : view === 'week' ? 'for this week' : 'for this month'}
        </div>
      )}

      {/* Render based on view */}
      {view === 'day' && timeBlocks.length > 0 && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-border"></div>

            {timeBlocks.map((block, index) => (
              <DraggableEvent
                key={block.id}
                block={block}
                index={index}
                isLast={index === timeBlocks.length - 1}
                typeConfig={typeConfig}
              />
            ))}
          </div>
        </DndContext>
      )}

      {view === 'week' && timeBlocks.length > 0 && (
        <WeekView timeBlocks={timeBlocks} currentDate={currentDate} typeConfig={typeConfig} />
      )}

      {view === 'month' && timeBlocks.length > 0 && (
        <MonthView timeBlocks={timeBlocks} currentDate={currentDate} typeConfig={typeConfig} />
      )}
    </Card>
  );
}
