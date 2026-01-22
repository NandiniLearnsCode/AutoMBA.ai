import { Sparkles, Target, Zap, Calendar } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { format, startOfDay, endOfDay } from "date-fns";
import { getToday, getUserTimezone } from "@/utils/dateUtils";
import { useMcpServer } from "@/hooks/useMcpServer";
import { useEffect, useState } from "react";

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
  events?: CalendarEvent[];
  userFocus?: string | null;
}

export function CommandCenter({ events: propEvents = [], userFocus }: CommandCenterProps) {
  const [loadedEvents, setLoadedEvents] = useState<CalendarEvent[]>([]);
  const { connected, callTool, connect } = useMcpServer('google-calendar');
  
  // Use prop events if provided, otherwise use loaded events
  const events = propEvents.length > 0 ? propEvents : loadedEvents;

  // Load today's events from calendar
  useEffect(() => {
    const loadTodayEvents = async () => {
      if (!connected) {
        await connect();
        return;
      }

      try {
        const today = getToday();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);
        
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);

        // First, get all calendars
        let allCalendars: any[] = [];
        try {
          const calendarsResponse = await callTool('list_calendars', {});
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
          
          // Filter to only selected/visible calendars
          allCalendars = allCalendars.filter((cal: any) => cal.accessRole && (cal.selected !== false));
        } catch (calError) {
          // Fallback to primary calendar
          allCalendars = [{ id: 'primary', summary: 'Primary Calendar' }];
        }

        const tz = getUserTimezone();

        // Fetch events from all calendars in parallel
        const eventPromises = allCalendars.map(async (cal: any) => {
          try {
            const response = await callTool('list_events', {
              calendarId: cal.id,
              timeMin: dayStart.toISOString(),
              timeMax: dayEnd.toISOString(),
              maxResults: 50,
              timeZone: tz,
            });

            // Parse events
            let calendarEvents: any[] = [];
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
            
            return calendarEvents;
          } catch (err) {
            console.warn(`Failed to fetch events from calendar ${cal.id}:`, err);
            return [];
          }
        });
        
        const allEventArrays = await Promise.all(eventPromises);
        const calendarEvents = allEventArrays.flat(); // Combine all events

        // Convert to CalendarEvent format (use user timezone for time display)
        const parsedEvents: CalendarEvent[] = calendarEvents
          .map((event: any) => {
            const hasDateTime = !!(event.start?.dateTime && event.end?.dateTime);
            const startTime = event.start?.dateTime || event.start?.date;
            if (!startTime) return null;
            
            let start: Date;
            let end: Date;
            let timeStr: string;
            let duration: number;

            if (!hasDateTime && event.start?.date && event.end?.date) {
              start = new Date(event.start.date + "T00:00:00");
              end = new Date(event.end.date + "T00:00:00");
              duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
              timeStr = "All day";
            } else {
              start = new Date(event.start?.dateTime ?? event.start?.date);
              end = new Date(event.end?.dateTime || event.end?.date || startTime);
              duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
              timeStr = start.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: tz,
              });
            }

            const summary = event.summary || 'Untitled Event';
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

        setLoadedEvents(parsedEvents);
      } catch (error) {
        console.error('Error loading today\'s events:', error);
      }
    };

    if (connected) {
      loadTodayEvents();
    }
  }, [connected, callTool, connect]);

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
  } else if (eventTypes.networking) {
    focus = "Networking & Connections";
  }

  // Generate contextual description
  const scheduleDescription = generateScheduleDescription();
  
  // Generate personalized greeting message
  const classCount = eventTypes.class || 0;
  const networkingCount = (eventTypes.networking || 0) + (eventTypes.recruiting || 0);
  
  let message = `${greeting}, Siddhant! `;
  
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