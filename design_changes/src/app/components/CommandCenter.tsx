import { Sparkles, Target, Zap, Calendar } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: number;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting";
  color: string;
}

interface CommandCenterProps {
  events: CalendarEvent[];
  userFocus?: string | null;
}

export function CommandCenter({ events, userFocus }: CommandCenterProps) {
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

  // Generate personalized message
  const classCount = eventTypes.class || 0;
  const networkingCount = (eventTypes.networking || 0) + (eventTypes.recruiting || 0);
  
  let message = `${greeting}, Alex! `;
  
  if (networkingCount > 0 && classCount > 0) {
    message += `Today you have ${classCount} class${classCount > 1 ? 'es' : ''} and ${networkingCount} networking event${networkingCount > 1 ? 's' : ''}. `;
    if (upcomingEvent.type === 'recruiting') {
      message += `I've scheduled extra prep time before your ${upcomingEvent.title}.`;
    } else {
      message += `Your schedule balances academics with professional development.`;
    }
  } else if (classCount > 0) {
    message += `You have ${classCount} class${classCount > 1 ? 'es' : ''} today. Great day to focus on academics!`;
  } else if (networkingCount > 0) {
    message += `${networkingCount} networking event${networkingCount > 1 ? 's' : ''} scheduled today. Perfect for building connections!`;
  } else {
    message += `You have ${totalEvents} event${totalEvents > 1 ? 's' : ''} scheduled today.`;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2 border-blue-500/20">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
      
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold">Your Day at a Glance</h2>
            <Badge className="bg-blue-500 text-white shrink-0">
              <Calendar className="w-3 h-3 mr-1" />
              Wednesday, Jan 21
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
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Up Next</div>
                <div className="text-sm font-semibold">{upcomingEvent.title} at {upcomingEvent.time}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}