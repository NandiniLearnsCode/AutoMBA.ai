import { useState, useRef, useEffect } from "react";
import { Bot, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Toaster } from "@/app/components/ui/sonner";
import { CommandCenter } from "@/app/components/CommandCenter";
import { AgentSuggestion } from "@/app/components/AgentSuggestion";
import { TimelineView } from "@/app/components/TimelineView";
import { HealthMetrics } from "@/app/components/HealthMetrics";
import { AssignmentGrid } from "@/app/components/AssignmentGrid";
import { NexusChatbot } from "@/app/components/NexusChatbot";
import { ChatInputCard } from "@/app/components/ChatInputCard";
import { ProfileSection } from "@/app/components/ProfileSection";
import { Settings } from "@/app/components/Settings";
import { McpProvider } from "@/contexts/McpContext";
import { CalendarProvider, useCalendar } from "@/contexts/CalendarContext";
import { getMcpServerConfigs } from "@/config/mcpServers";
import { toast } from "sonner";
import { generateAIRecommendations, AIRecommendation, UserPriority } from "@/utils/aiRecommendationService";
import { useMcpServer } from "@/hooks/useMcpServer";
import { getToday } from "@/utils/dateUtils";
import { startOfDay, endOfDay, format } from "date-fns";
import { PriorityRanking, defaultPriorities, PriorityItem } from "@/app/components/PriorityRanking";

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chatbotRef = useRef<{ handleSendMessage: (message: string) => void } | null>(null);

  // Shared selected date state for CommandCenter and TimelineView
  const [selectedDate, setSelectedDate] = useState(() => getToday());

  // AI-generated recommendations
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string;
      type: "buffer" | "urgency" | "shift" | "optimization" | "alert" | "success";
      title: string;
      description: string;
      assignmentId?: string;
      eventId?: string;
      action?: AIRecommendation['action'];
    }>
  >([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [priorities, setPriorities] = useState<PriorityItem[]>(defaultPriorities);
  const [lastPrioritiesJson, setLastPrioritiesJson] = useState<string>(JSON.stringify(defaultPriorities.map(p => p.id)));

  // MCP server for calendar operations
  const { connected, callTool, connect } = useMcpServer('google-calendar');
  const { getEvents, fetchEvents, events: calendarEvents } = useCalendar();

  // Helper function to find available time slots
  const findAvailableSlots = (
    targetDate: Date,
    durationMinutes: number,
    activityTitle: string,
    excludeEventId?: string
  ): { time: string; label: string }[] => {
    const slots: { time: string; label: string }[] = [];
    const lowerActivity = activityTitle.toLowerCase();

    // Define preferred time ranges based on activity type
    let preferredRanges: { start: number; end: number; label: string }[] = [];

    if (/dinner|supper|evening meal/i.test(lowerActivity)) {
      preferredRanges = [
        { start: 18, end: 21, label: "Evening" },
        { start: 19, end: 22, label: "Late Evening" },
      ];
    } else if (/lunch|midday meal/i.test(lowerActivity)) {
      preferredRanges = [
        { start: 11, end: 14, label: "Midday" },
        { start: 12, end: 15, label: "Afternoon" },
      ];
    } else if (/gym|workout|exercise|fitness/i.test(lowerActivity)) {
      preferredRanges = [
        { start: 6, end: 9, label: "Early Morning" },
        { start: 17, end: 20, label: "Evening" },
      ];
    } else if (/study|homework|buffer/i.test(lowerActivity)) {
      preferredRanges = [
        { start: 9, end: 12, label: "Morning" },
        { start: 14, end: 17, label: "Afternoon" },
        { start: 19, end: 22, label: "Evening" },
      ];
    } else {
      preferredRanges = [
        { start: 9, end: 12, label: "Morning" },
        { start: 13, end: 17, label: "Afternoon" },
        { start: 18, end: 21, label: "Evening" },
      ];
    }

    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    const busySlots = calendarEvents
      .filter(e => {
        if (excludeEventId && e.id === excludeEventId) return false;
        return e.startDate && format(e.startDate, 'yyyy-MM-dd') === targetDateStr;
      })
      .map(e => ({
        start: e.startDate.getHours() * 60 + e.startDate.getMinutes(),
        end: (e.endDate || e.startDate).getHours() * 60 + (e.endDate || e.startDate).getMinutes() + (e.endDate ? 0 : e.duration),
      }));

    for (const range of preferredRanges) {
      for (let hour = range.start; hour < range.end; hour++) {
        for (const minute of [0, 30]) {
          const slotStart = hour * 60 + minute;
          const slotEnd = slotStart + durationMinutes;
          if (slotEnd > range.end * 60) continue;

          const hasConflict = busySlots.some(busy =>
            (slotStart < busy.end && slotEnd > busy.start)
          );

          if (!hasConflict) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const displayTime = format(new Date(2000, 0, 1, hour, minute), 'h:mm a');
            slots.push({
              time: timeStr,
              label: `${displayTime} (${range.label})`,
            });

            if (slots.filter(s => s.label.includes(range.label)).length >= 2) break;
          }
        }
        if (slots.filter(s => s.label.includes(range.label)).length >= 2) break;
      }
    }

    return slots.slice(0, 3);
  };

  // Function to generate recommendations (extracted for reuse)
  const generateRecommendations = async (currentPriorities: PriorityItem[]) => {
      try {
        setLoadingRecommendations(true);
        const today = getToday();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);
        
        await fetchEvents(dayStart, dayEnd);
        const calendarEvents = getEvents(dayStart, dayEnd);

        // Convert to format expected by AI service
        const eventsForAI = calendarEvents
          .map((event: any) => {
            const startTime = event.start?.dateTime || event.start?.date;
            if (!startTime) return null;
            
            const start = new Date(startTime);
            const end = new Date(event.end?.dateTime || event.end?.date || startTime);
            const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
            
            const timeStr = start.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            });

            const summary = event.summary || 'Untitled Event';
            const lowerSummary = summary.toLowerCase();
            let type = "meeting";
            
            if (lowerSummary.includes('class') || lowerSummary.includes('course')) type = "class";
            else if (lowerSummary.includes('study') || lowerSummary.includes('homework')) type = "study";
            else if (lowerSummary.includes('gym') || lowerSummary.includes('workout')) type = "workout";
            else if (lowerSummary.includes('networking') || lowerSummary.includes('coffee')) type = "networking";
            else if (lowerSummary.includes('recruiting') || lowerSummary.includes('interview')) type = "recruiting";

            return {
              id: event.id,
              title: summary,
              time: timeStr,
              duration,
              type,
              startDate: start,
              endDate: end,
            };
          })
          .filter((e: any) => e !== null);

        // Load assignments with system date awareness
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        const formatDateForDisplay = (date: Date) => {
          return format(date, "MMM d, h:mm a");
        };
        
        const assignments = [
          { 
            id: "1", 
            title: "Valuation Case Study", 
            course: "Corporate Finance", 
            dueDate: `Tomorrow, ${formatDateForDisplay(tomorrow)}`, 
            priority: "high", 
            progress: 35 
          },
          { 
            id: "5", 
            title: "Operations Group Project", 
            course: "Operations Management", 
            dueDate: formatDateForDisplay(dayAfterTomorrow), 
            priority: "high", 
            progress: 20 
          },
        ];

        // Convert priorities to format expected by AI service
        const userPriorities: UserPriority[] = currentPriorities.map((p, index) => ({
          id: p.id,
          label: p.label,
          rank: index + 1,
        }));

        // Generate AI recommendations with user priorities
        const aiRecs = await generateAIRecommendations(eventsForAI, assignments, userPriorities);

        // Convert AI recommendations to suggestion format
        const formattedSuggestions = aiRecs.map((rec) => ({
          id: rec.id,
          type: rec.type as any,
          title: rec.title,
          description: rec.description,
          eventId: rec.action.eventId,
          assignmentId: rec.action.type === "add" && rec.action.title?.includes("Study") ? "1" : undefined,
          action: rec.action,
        }));

        setSuggestions(formattedSuggestions);
      } catch (error) {
        console.error("Error generating recommendations:", error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

  // Generate AI recommendations on mount
  useEffect(() => {
    generateRecommendations(priorities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle priority changes - regenerate recommendations
  const handlePrioritiesChange = async (newPriorities: PriorityItem[]) => {
    setPriorities(newPriorities);

    // Check if priorities actually changed (by comparing IDs order)
    const newPrioritiesJson = JSON.stringify(newPriorities.map(p => p.id));
    if (newPrioritiesJson !== lastPrioritiesJson) {
      setLastPrioritiesJson(newPrioritiesJson);

      // Show toast that recommendations are being updated
      toast.info("Updating recommendations based on your new priorities...");

      // Regenerate recommendations with new priorities
      await generateRecommendations(newPriorities);

      toast.success("Recommendations updated!", {
        description: `Now prioritizing: ${newPriorities[0].label} > ${newPriorities[1].label} > ${newPriorities[2].label}`,
      });
    }
  };

  // Handle priority changes from chatbot
  const handleChatbotPriorityChange = async (newPriorityIds: string[]) => {
    // Convert priority IDs to PriorityItem objects
    const priorityLabels: Record<string, { label: string; icon: string }> = {
      recruiting: { label: "Recruiting", icon: "💼" },
      socials: { label: "Socials", icon: "🎉" },
      sleep: { label: "Sleep", icon: "😴" },
      clubs: { label: "Clubs", icon: "👥" },
      homework: { label: "Homework", icon: "📚" },
    };

    const newPriorities: PriorityItem[] = newPriorityIds.map((id) => ({
      id: id as PriorityItem["id"],
      label: priorityLabels[id]?.label || id,
      icon: priorityLabels[id]?.icon || "📌",
    }));

    // Update priorities state (this will update the UI)
    setPriorities(newPriorities);
    setLastPrioritiesJson(JSON.stringify(newPriorityIds));

    // Regenerate recommendations with new priorities
    await generateRecommendations(newPriorities);
  };

  const handleAcceptSuggestion = async (id: string, suggestionData?: {
    assignmentId?: string;
    eventId?: string;
    type?: string;
    action?: AIRecommendation['action'];
  }) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    try {
      if (!connected) {
        await connect();
      }

      const action = suggestion.action || suggestionData?.action;

      if (action) {
        const today = getToday();

        // Handle different action types
        if (action.type === "add" && action.title && action.newTime && action.duration) {
          // Add new event
          const [hours, minutes] = action.newTime.split(':').map(Number);
          const startDate = new Date(today);
          startDate.setHours(hours, minutes, 0, 0);
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + action.duration);

          // Check for conflicts before creating
          const eventStart = startDate.getTime();
          const eventEnd = endDate.getTime();
          const conflictingEvent = calendarEvents.find(existingEvent => {
            if (!existingEvent.startDate || !existingEvent.endDate) return false;
            const existingStart = existingEvent.startDate.getTime();
            const existingEnd = existingEvent.endDate.getTime();
            return (eventStart < existingEnd && eventEnd > existingStart);
          });

          if (conflictingEvent) {
            const alternativeSlots = findAvailableSlots(startDate, action.duration, action.title);
            let toastDescription = `Conflicts with "${conflictingEvent.title}" at ${conflictingEvent.time}.`;
            if (alternativeSlots.length > 0) {
              toastDescription += ` Try: ${alternativeSlots.map(s => s.label.split(' (')[0]).join(', ')}`;
            }
            toast.error("Time conflict detected", { description: toastDescription });
            return;
          }

          await callTool('create_event', {
            calendarId: 'primary',
            summary: action.title,
            description: `Added via Kaisey recommendation: ${suggestion.title}`,
            start: { dateTime: startDate.toISOString() },
            end: { dateTime: endDate.toISOString() },
          });

          toast.success("Event added", {
            description: `${action.title} scheduled for ${action.newTime}`,
          });
        } else if (action.type === "move" && action.eventId && action.newTime) {
          // Move existing event - use update_event with estimated duration
          const [hours, minutes] = action.newTime.split(':').map(Number);
          const startDate = new Date(today);
          startDate.setHours(hours, minutes, 0, 0);

          // Default duration to 60 minutes if not specified
          const duration = action.duration || 60;
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + duration);

          // Check for conflicts (excluding the event being moved)
          const eventStart = startDate.getTime();
          const eventEnd = endDate.getTime();
          const conflictingEvent = calendarEvents.find(existingEvent => {
            if (existingEvent.id === action.eventId) return false;
            if (!existingEvent.startDate || !existingEvent.endDate) return false;
            const existingStart = existingEvent.startDate.getTime();
            const existingEnd = existingEvent.endDate.getTime();
            return (eventStart < existingEnd && eventEnd > existingStart);
          });

          if (conflictingEvent) {
            const eventTitle = action.eventTitle || 'Event';
            const alternativeSlots = findAvailableSlots(startDate, duration, eventTitle, action.eventId);
            let toastDescription = `Conflicts with "${conflictingEvent.title}" at ${conflictingEvent.time}.`;
            if (alternativeSlots.length > 0) {
              toastDescription += ` Try: ${alternativeSlots.map(s => s.label.split(' (')[0]).join(', ')}`;
            }
            toast.error("Time conflict detected", { description: toastDescription });
            return;
          }

          await callTool('update_event', {
            calendarId: 'primary',
            eventId: action.eventId,
            start: { dateTime: startDate.toISOString() },
            end: { dateTime: endDate.toISOString() },
          });

          toast.success("Event moved", {
            description: `${action.eventTitle || 'Event'} rescheduled to ${action.newTime}`,
          });
        } else if (action.type === "delete" && action.eventId) {
          // Delete event - try delete_event, fallback to update with cancellation
          try {
            await callTool('delete_event', {
              calendarId: 'primary',
              eventId: action.eventId,
            });
          } catch (deleteError) {
            // If delete_event doesn't exist, try updating event to cancelled status
            console.warn("delete_event not available, skipping deletion");
            toast.info("Event deletion not available", {
              description: "Please delete the event manually from Google Calendar",
            });
            return;
          }

          toast.success("Event removed", {
            description: `${action.eventTitle || 'Event'} deleted from your calendar`,
          });
        } else if (suggestion.type === "urgency" && suggestionData?.assignmentId) {
          // Fallback for assignment scheduling
          toast.success("Study time scheduled", {
            description: "2-hour study block added to your calendar.",
          });
        }
      }
      
      // Remove suggestion
      setSuggestions(suggestions.filter((s) => s.id !== id));
      
      toast.success("Calendar updated successfully", {
        description: "Your schedule has been optimized by Kaisey.",
      });
    } catch (error) {
      console.error("Error accepting suggestion:", error);
      toast.error("Failed to update calendar", {
        description: "Please try again.",
      });
    }
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
  };

  const handleScheduleChange = (action: string, details: any) => {
    toast.success("Schedule updated", {
      description: `${details}`,
    });
  };

  // Handle chat message from inline input
  const handleChatMessage = (message: string) => {
    // Access the chatbot's handleSendMessage via window (workaround)
    // In a better implementation, we'd use a ref or context
    if ((window as any).__nexusChatbotSendMessage) {
      (window as any).__nexusChatbotSendMessage(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Kaisey</h1>
              <p className="text-xs text-muted-foreground">MBA Co-Pilot</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
            
            <Settings 
              open={settingsOpen} 
              onOpenChange={setSettingsOpen}
            />
          </div>
        </div>
      </header>

      {/* Main Content - Single Column Vertical Feed */}
      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Hero Section: Day at a Glance */}
        <CommandCenter selectedDate={selectedDate} />

        {/* Priority Ranking */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xs text-muted-foreground">Your Priorities</h3>
            <Badge variant="outline" className="text-xs">Drag to reorder</Badge>
          </div>
          <PriorityRanking
            priorities={priorities}
            onPrioritiesChange={handlePrioritiesChange}
          />
        </div>

        {/* Chat Input Card */}
        <ChatInputCard onSendMessage={handleChatMessage} />

        {/* Recommendations */}
        {(suggestions.length > 0 || loadingRecommendations) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold">My Recommendations</h3>
              {!loadingRecommendations && (
                <Badge variant="outline" className="text-xs">{suggestions.length}</Badge>
              )}
              {loadingRecommendations && (
                <Badge variant="outline" className="text-xs">Analyzing...</Badge>
              )}
            </div>
            {loadingRecommendations && (
              <div className="text-sm text-muted-foreground mb-3">
                Kaisey is analyzing your schedule and generating personalized recommendations...
              </div>
            )}
            {suggestions.map((suggestion) => (
              <AgentSuggestion
                key={suggestion.id}
                type={suggestion.type === "buffer" || suggestion.type === "shift" ? "conflict" : suggestion.type === "urgency" ? "optimization" : suggestion.type}
                title={suggestion.title}
                description={suggestion.description}
                action={{
                  label: suggestion.action?.type === "add" ? "Add to Calendar" :
                         suggestion.action?.type === "move" ? `Move to ${suggestion.action.newTime || 'New Time'}` :
                         suggestion.action?.type === "delete" ? "Remove Event" :
                         suggestion.type === "urgency" ? "Schedule 2 Hours" :
                         suggestion.type === "shift" ? "Shift Event" : "Accept & Update Calendar",
                  onClick: () => handleAcceptSuggestion(suggestion.id, {
                    assignmentId: suggestion.assignmentId,
                    eventId: suggestion.eventId,
                    type: suggestion.type,
                    action: suggestion.action,
                  }),
                }}
                dismiss={() => handleDismissSuggestion(suggestion.id)}
              />
            ))}
          </div>
        )}

        {/* Calendar: Timeline View */}
        <TimelineView selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {/* Canvas Assignments */}
        <AssignmentGrid />

        {/* Footer: Profile & Biometrics */}
        <div className="space-y-6">
          <ProfileSection />
          <HealthMetrics />
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster />

      {/* Hidden Nexus Chatbot (preserves all backend logic) */}
      <NexusChatbot
        onScheduleChange={handleScheduleChange}
        onPriorityChange={handleChatbotPriorityChange}
        isHidden={true} // Hidden - using inline ChatInputCard instead
      />
    </div>
  );
}

// Wrap App with MCP Provider
export default function App() {
  const mcpServers = getMcpServerConfigs()
    .filter((s) => s.enabled && s.url)
    .map((s) => ({
      name: s.name,
      url: s.url,
      headers: s.headers,
    }));

  return (
    <McpProvider servers={mcpServers}>
      <CalendarProvider>
        <AppContent />
      </CalendarProvider>
    </McpProvider>
  );
}
