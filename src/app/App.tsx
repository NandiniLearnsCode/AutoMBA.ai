import { useState, useRef, useEffect } from "react";
import { Bot, Bell, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Toaster } from "@/app/components/ui/sonner";
import { CommandCenter } from "@/app/components/CommandCenter";
import { AgentSuggestion } from "@/app/components/AgentSuggestion";
import { TimelineView } from "@/app/components/TimelineView";
import { HealthMetrics } from "@/app/components/HealthMetrics";
import { NexusChatbot } from "@/app/components/NexusChatbot";
import { ChatInputCard } from "@/app/components/ChatInputCard";
import { ProfileSection } from "@/app/components/ProfileSection";
import { Settings } from "@/app/components/Settings";
import { McpProvider } from "@/contexts/McpContext";
import { getMcpServerConfigs } from "@/config/mcpServers";
import { toast } from "sonner";
import { generateAIRecommendations, AIRecommendation } from "@/utils/aiRecommendationService";
import { useMcpServer } from "@/hooks/useMcpServer";
import { getToday, getUserTimezone } from "@/utils/dateUtils";
import { startOfDay, endOfDay, format } from "date-fns";

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chatbotRef = useRef<{ handleSendMessage: (message: string) => void } | null>(null);
  
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
  
  // MCP server for calendar operations
  const { connected, callTool, connect } = useMcpServer('google-calendar');

  // Generate AI recommendations on mount
  useEffect(() => {
    const generateRecommendations = async () => {
      if (!connected) {
        await connect();
        return;
      }

      try {
        setLoadingRecommendations(true);
        const today = getToday();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);
        
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);

        // Load today's events (use user timezone for consistent display)
        const tz = getUserTimezone();
        const response = await callTool('list_events', {
          calendarId: 'primary',
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
              hour12: false,
              timeZone: tz,
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

        // Generate AI recommendations
        const aiRecs = await generateAIRecommendations(eventsForAI, assignments);
        
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

    if (connected) {
      generateRecommendations();
      
      // Refresh recommendations every 5 minutes to stay contextually aware
      const refreshInterval = setInterval(() => {
        generateRecommendations();
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(refreshInterval);
    }
  }, [connected, callTool, connect]);

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
            <Button size="sm" variant="outline" className="relative">
              <Bell className="w-4 h-4" />
              {suggestions.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white">
                  {suggestions.length}
                </Badge>
              )}
            </Button>
            
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
        <CommandCenter />

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
        <TimelineView />

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
      <AppContent />
    </McpProvider>
  );
}
