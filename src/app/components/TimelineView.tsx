import { useState, useEffect } from "react";
import { Clock, Users, BookOpen, Dumbbell, Coffee, Briefcase, GraduationCap, RefreshCw } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { fetchCalendarEvents, isAuthenticated, authenticateUser } from "@/services/googleCalendar";

interface TimeBlock {
  id: string;
  time: string;
  duration: number;
  title: string;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer";
  status: "completed" | "current" | "upcoming" | "suggested";
  location?: string;
  priority: "hard-block" | "flexible" | "optional";
}

const typeConfig = {
  class: { icon: GraduationCap, color: "bg-blue-500" },
  meeting: { icon: Users, color: "bg-purple-500" },
  study: { icon: BookOpen, color: "bg-indigo-500" },
  workout: { icon: Dumbbell, color: "bg-green-500" },
  networking: { icon: Coffee, color: "bg-orange-500" },
  recruiting: { icon: Briefcase, color: "bg-red-500" },
  buffer: { icon: Clock, color: "bg-gray-400" },
};

export function TimelineView() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if authenticated
      if (!isAuthenticated()) {
        await authenticateUser();
      }
      
      setIsConnected(true);
      const today = new Date();
      const events = await fetchCalendarEvents(today);
      setTimeBlocks(events);
    } catch (err: any) {
      console.error('Error loading calendar:', err);
      setError(err.message || 'Failed to load Google Calendar events');
      setIsConnected(false);
      setTimeBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to load calendar events on mount
    loadCalendarEvents();
  }, []);

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading && timeBlocks.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading calendar...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Today's Timeline</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatDate()}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadCalendarEvents}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && !isConnected && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-600 mb-2">
            {error.includes('authenticate') || error.includes('sign in') 
              ? 'Please sign in to Google Calendar to view your events'
              : error}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={loadCalendarEvents}
            className="h-7 text-xs"
          >
            Connect Google Calendar
          </Button>
        </div>
      )}

      {error && isConnected && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {timeBlocks.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No events scheduled for today
        </div>
      )}

      {timeBlocks.length > 0 && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-border"></div>

          {timeBlocks.map((block, index) => {
            const config = typeConfig[block.type];
            const Icon = config.icon;
            const isLast = index === timeBlocks.length - 1;

            return (
              <div key={block.id} className={`relative flex gap-4 ${!isLast ? "mb-6" : ""}`}>
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

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div
                    className={`rounded-lg border p-3 ${
                      block.status === "current" ? "border-blue-500 bg-blue-500/5" : ""
                    } ${block.status === "completed" ? "opacity-50" : ""} ${
                      block.status === "suggested" ? "border-green-500 border-dashed bg-green-500/5" : ""
                    }`}
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
          })}
        </div>
      )}
    </Card>
  );
}
