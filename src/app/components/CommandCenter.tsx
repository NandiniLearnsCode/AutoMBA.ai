import { Sparkles, Target, Zap, Calendar } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { format, startOfDay, endOfDay } from "date-fns";
import { getToday } from "@/utils/dateUtils";
import { useMcpServer } from "@/hooks/useMcpServer";
import { useEffect, useState } from "react";
import { useCalendar } from "@/contexts/CalendarContext";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: number;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting";
  color: string;
  startDate?: Date;
  endDate?: Date;
}

interface CommandCenterProps {
  userFocus?: string | null;
}

export function CommandCenter({ userFocus }: CommandCenterProps) {
  const { connected, callTool, connect } = useMcpServer('google-calendar');
  const { getEvents, fetchEvents, loading: calendarLoading } = useCalendar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Load today's events from calendar
  useEffect(() => {
    const loadTodayEvents = async () => {
      const today = getToday();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      
      await fetchEvents(dayStart, dayEnd);
      const fetchedEvents = getEvents(dayStart, dayEnd);

      // Convert to CalendarEvent format
      const parsedEvents: CalendarEvent[] = fetchedEvents
        .map((event: any) => {
          const startTime = event.startDate;
          if (!startTime) return null;
          
          const start = new Date(startTime);
          const end = new Date(event.endDate);
          const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          
          const timeStr = start.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          });

          const summary = event.title || 'Untitled Event';
          const lowerSummary = summary.toLowerCase();
          let type: CalendarEvent['type'] = "meeting";
          
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
          }

          return {
            id: event.id,
            title: summary,
            time: timeStr,
            duration,
            type,
            color: "",
            startDate: start,
            endDate: end,
          };
        })
        .filter((e): e is CalendarEvent => e !== null)
        .sort((a, b) => a.time.localeCompare(b.time));

      setEvents(parsedEvents);
    };

    loadTodayEvents();
    // Only depend on the functions, not on their results to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount, or when explicitly needed

  // Get current time-based greeting
  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon";
  if (currentHour >= 17) greeting = "Good evening";

  // Analyze today's events
  const totalEvents = events.length;
  const eventTypes = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get next event (simple logic based on current time)
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const upcomingEvent = events.find(event => event.time > currentTime) || events[0];
  
  // Generate contextual description of today's schedule
  const generateScheduleDescription = (): string => {
    if (totalEvents === 0) {
      return "You have a free day today. Perfect opportunity to catch up on assignments or schedule networking meetings.";
    }

    const sortedEvents = [...events].sort((a, b) => a.time.localeCompare(b.time));
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    
    let description = `Your day starts at ${firstEvent.time} with "${firstEvent.title}"`;
    
    if (totalEvents > 1) {
      description += ` and wraps up at ${lastEvent.time} with "${lastEvent.title}". `;
    } else {
      description += ". ";
    }

    // Add context based on event types
    if (eventTypes.class && eventTypes.class >= 2) {
      description += `You have ${eventTypes.class} classes today, so focus on academic preparation. `;
    }
    
    if (eventTypes.networking || eventTypes.recruiting) {
      const networkingTotal = (eventTypes.networking || 0) + (eventTypes.recruiting || 0);
      description += `${networkingTotal} networking event${networkingTotal > 1 ? 's' : ''} ${networkingTotal > 1 ? 'are' : 'is'} scheduled - great for building connections. `;
    }
    
    if (eventTypes.workout) {
      description += `You've scheduled ${eventTypes.workout} workout${eventTypes.workout > 1 ? 's' : ''} - maintaining your wellness routine. `;
    }

    // Check for tight schedule
    let hasTightSchedule = false;
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];
      const currentEnd = new Date(current.startDate || new Date());
      currentEnd.setMinutes(currentEnd.getMinutes() + current.duration);
      const nextStart = new Date(next.startDate || new Date());
      
      const bufferMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
      if (bufferMinutes < 15 && bufferMinutes >= 0) {
        hasTightSchedule = true;
        break;
      }
    }

    if (hasTightSchedule) {
      description += "Note: Some events are back-to-back - consider adding buffer time for transitions.";
    }

    return description;
  };

  // Determine focus based on event types or user's stated focus
  let focus = "Balanced Schedule";
  
  // Use user's stated focus if available, otherwise auto-detect
  if (userFocus) {
    focus = userFocus;
  } else if (eventTypes.recruiting && eventTypes.networking) {
    focus = "Recruiting & Networking";
  } else if (eventTypes.class && eventTypes.class >= 2) {
    focus = "Academic Focus";
  } else if (eventTypes.recruiting) {
    focus = "Professional Development";
  }

  // Generate contextual description
  const scheduleDescription = generateScheduleDescription();
  
  // Generate personalized greeting message
  const classCount = eventTypes.class || 0;
  const networkingCount = (eventTypes.networking || 0) + (eventTypes.recruiting || 0);
  
  let message = `${greeting}, Star MBA Student! `;
  
  if (totalEvents > 0) {
    message += scheduleDescription;
  } else {
    message += "You have a free day today. Perfect opportunity to catch up on assignments or schedule networking meetings.";
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-purple-100 to-pink-50 border-2 border-purple-200/50">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
      
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold">Your Day at a Glance</h2>
            <Badge className="bg-blue-500 text-white shrink-0">
              <Calendar className="w-3 h-3 mr-1" />
              {format(getToday(), 'EEEE, MMM d')}
            </Badge>
          </div>
        
          <p className="text-sm mb-4 leading-relaxed">
            {message}
          </p>
          
          <div className="flex items-start gap-6">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Today's Focus</div>
                <div className="text-sm font-semibold">{focus}</div>
              </div>
            </div>
            {upcomingEvent && (
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Up Next</div>
                  <div className="text-sm font-semibold">{upcomingEvent.title} at {upcomingEvent.time}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}