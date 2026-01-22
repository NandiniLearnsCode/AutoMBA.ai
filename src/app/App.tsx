import { useState, useRef } from "react";
import { Bot, Bell, Settings as SettingsIcon } from "lucide-react";
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
import { getMcpServerConfigs } from "@/config/mcpServers";
import { toast } from "sonner";

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chatbotRef = useRef<{ handleSendMessage: (message: string) => void } | null>(null);
  
  // Initialize suggestions with buffer-based logic and urgency detection
  const [suggestions, setSuggestions] = useState<
    Array<{
      id: string;
      type: "buffer" | "urgency" | "shift" | "optimization" | "alert" | "success";
      title: string;
      description: string;
      assignmentId?: string;
      eventId?: string;
    }>
  >([
    {
      id: "1",
      type: "shift" as const,
      title: "Tight Schedule: No Buffer Time",
      description: "Goldman Sachs Info Session ends at 1:00 PM, and your gym session starts immediately after at 1:00 PM. With Low HRV indicating you need recovery, I recommend pushing your gym session to 2:00 PM for a proper buffer.",
      eventId: "gym-session-1",
    },
    {
      id: "2",
      type: "urgency" as const,
      title: "Urgent Assignment Due Tomorrow",
      description: "Valuation Case Study is due Jan 22, 11:59 PM (35% complete, 4h remaining). I recommend scheduling 2 hours this afternoon at 2:00 PM when you have a gap after your gym session.",
      assignmentId: "1",
    },
    {
      id: "3",
      type: "urgency" as const,
      title: "Operations Project Needs Attention",
      description: "Operations Group Project is due Jan 23, 9:00 AM (only 20% complete, 6h remaining). You have limited time - I suggest blocking tonight 6:00-9:00 PM and tomorrow morning 6:00-9:00 AM.",
      assignmentId: "5",
    },
  ]);

  const handleAcceptSuggestion = async (id: string, suggestionData?: {
    assignmentId?: string;
    eventId?: string;
    type?: string;
  }) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    try {
      // Handle assignment scheduling (type: 'study')
      if (suggestion.type === "urgency" && suggestionData?.assignmentId) {
        toast.success("Study time scheduled", {
          description: "2-hour study block added to your calendar.",
        });
      }
      
      // Handle event shifting (Gym session shift)
      if (suggestion.type === "shift" && suggestionData?.eventId) {
        toast.success("Event shifted", {
          description: "Gym session moved to 2:00 PM to create recovery buffer.",
        });
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
        {suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold">My Recommendations</h3>
              <Badge variant="outline" className="text-xs">{suggestions.length}</Badge>
            </div>
            {suggestions.map((suggestion) => (
              <AgentSuggestion
                key={suggestion.id}
                type={suggestion.type === "buffer" || suggestion.type === "shift" ? "conflict" : suggestion.type === "urgency" ? "optimization" : suggestion.type}
                title={suggestion.title}
                description={suggestion.description}
                action={{
                  label: suggestion.type === "urgency" ? "Schedule 2 Hours" : suggestion.type === "shift" ? "Shift to 2:00 PM" : "Accept & Update Calendar",
                  onClick: () => handleAcceptSuggestion(suggestion.id, {
                    assignmentId: suggestion.assignmentId,
                    eventId: suggestion.eventId,
                    type: suggestion.type,
                  }),
                }}
                dismiss={() => handleDismissSuggestion(suggestion.id)}
              />
            ))}
          </div>
        )}

        {/* Calendar: Timeline View */}
        <TimelineView />

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
