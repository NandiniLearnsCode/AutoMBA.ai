import { useState } from "react";
import { Bot, Bell, Settings } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Toaster } from "@/app/components/ui/sonner";
import { CommandCenter } from "@/app/components/CommandCenter";
import { AgentSuggestion } from "@/app/components/AgentSuggestion";
import { CalendarView } from "@/app/components/CalendarView";
import { HealthMetrics } from "@/app/components/HealthMetrics";
import { AssignmentGrid } from "@/app/components/AssignmentGrid";
import { KaiseyChatbot } from "@/app/components/KaiseyChatbot";
import { WelcomePage } from "@/app/components/WelcomePage";
import { SettingsPage } from "@/app/components/SettingsPage";
import { ProfileSection } from "@/app/components/ProfileSection";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: number;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting";
  color: string;
}

interface CalendarAction {
  type: "add" | "remove" | "replace";
  event: {
    title: string;
    time: string;
    duration: number;
  };
  replaceWith?: {
    title: string;
    time: string;
    duration: number;
  };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userFocus, setUserFocus] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({
    openaiKey: "",
    googleCredentials: "",
  });
  const [suggestions, setSuggestions] = useState([
    {
      id: "1",
      type: "conflict" as const,
      title: "Tight Schedule: No Buffer Time",
      description: "Goldman Sachs Info Session ends at 1:00 PM, and your gym session starts immediately after at 1:00 PM. With Low HRV indicating you need recovery, I recommend pushing your gym session to 2:00 PM for a proper buffer.",
    },
    {
      id: "2",
      type: "optimization" as const,
      title: "Urgent Assignment Due Tomorrow",
      description: "Valuation Case Study is due Jan 22, 11:59 PM (35% complete, 4h remaining). I recommend scheduling 2 hours this afternoon at 2:00 PM when you have a gap after your gym session.",
    },
    {
      id: "3",
      type: "optimization" as const,
      title: "Operations Project Needs Attention",
      description: "Operations Group Project is due Jan 23, 9:00 AM (only 20% complete, 6h remaining). You have limited time - I suggest blocking tonight 6:00-9:00 PM and tomorrow morning 6:00-9:00 AM.",
    },
  ]);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    { id: "1", title: "Corporate Finance", time: "08:00", duration: 90, type: "class", color: "bg-blue-500" },
    { id: "2", title: "Coffee Chat: Sarah (McKinsey)", time: "10:15", duration: 45, type: "networking", color: "bg-orange-500" },
    { id: "3", title: "Strategy Canvas Quiz", time: "11:00", duration: 60, type: "class", color: "bg-blue-500" },
    { id: "4", title: "Goldman Sachs Info Session", time: "12:00", duration: 60, type: "recruiting", color: "bg-red-500" },
    { id: "5", title: "Gym Session", time: "13:00", duration: 45, type: "workout", color: "bg-green-500" },
  ]);

  const handleLogin = (openaiKey: string, googleCreds: string) => {
    setCredentials({ openaiKey, googleCredentials: googleCreds });
    setIsLoggedIn(true);
    toast.success("Welcome to Kaisey!", {
      description: "Your AI MBA Co-Pilot is ready.",
    });
  };

  const handleAcceptSuggestion = (id: string) => {
    const suggestion = suggestions.find(s => s.id === id);
    
    // Handle schedule conflict by pushing gym session
    if (suggestion && suggestion.id === "1") {
      // Push gym session from 1:00 PM to 2:00 PM
      setCalendarEvents(prevEvents => {
        return prevEvents.map(event => {
          if (event.title === "Gym Session" && event.time === "13:00") {
            return { ...event, time: "14:00" };
          }
          return event;
        }).sort((a, b) => a.time.localeCompare(b.time));
      });
    } else if (suggestion && suggestion.id === "2") {
      // Valuation Case Study suggestion - add 2 hours at 2:00 PM
      const newEvent: CalendarEvent = {
        id: (Math.max(0, ...calendarEvents.map(e => parseInt(e.id) || 0)) + 1).toString(),
        title: "Study: Valuation Case Study",
        time: "14:00",
        duration: 120,
        type: "study",
        color: "bg-indigo-500"
      };
      setCalendarEvents(prevEvents => {
        const updated = [...prevEvents, newEvent];
        return updated.sort((a, b) => a.time.localeCompare(b.time));
      });
    } else if (suggestion && suggestion.id === "3") {
      // Operations Project suggestion - add two blocks
      const evening: CalendarEvent = {
        id: (Math.max(0, ...calendarEvents.map(e => parseInt(e.id) || 0)) + 1).toString(),
        title: "Study: Operations Group Project",
        time: "18:00",
        duration: 180,
        type: "study",
        color: "bg-indigo-500"
      };
      const morning: CalendarEvent = {
        id: (Math.max(0, ...calendarEvents.map(e => parseInt(e.id) || 0)) + 2).toString(),
        title: "Study: Operations Group Project (Morning)",
        time: "06:00",
        duration: 180,
        type: "study",
        color: "bg-indigo-500"
      };
      setCalendarEvents(prevEvents => {
        const updated = [...prevEvents, evening, morning];
        return updated.sort((a, b) => a.time.localeCompare(b.time));
      });
    }
    
    setSuggestions(suggestions.filter((s) => s.id !== id));
    toast.success("Calendar updated successfully", {
      description: "Your schedule has been optimized by Kaisey.",
    });
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
  };

  const handleScheduleChange = (calendarAction: CalendarAction) => {
    console.log("handleScheduleChange called with:", calendarAction);
    
    setCalendarEvents(prevEvents => {
      let updatedEvents = [...prevEvents];
      
      // Determine event type and color based on title
      const getEventTypeAndColor = (title: string): { type: CalendarEvent["type"], color: string } => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("gym") || lowerTitle.includes("yoga") || lowerTitle.includes("meditation") || lowerTitle.includes("workout")) {
          return { type: "workout", color: "bg-green-500" };
        } else if (lowerTitle.includes("coffee") || lowerTitle.includes("lunch") || lowerTitle.includes("follow-up") || lowerTitle.includes("networking")) {
          return { type: "networking", color: "bg-orange-500" };
        } else if (lowerTitle.includes("prep") || lowerTitle.includes("study") || lowerTitle.includes("focus") || lowerTitle.includes("deep work") || lowerTitle.includes("buffer")) {
          return { type: "study", color: "bg-indigo-500" };
        } else if (lowerTitle.includes("goldman") || lowerTitle.includes("info session") || lowerTitle.includes("recruiting")) {
          return { type: "recruiting", color: "bg-red-500" };
        } else {
          return { type: "class", color: "bg-blue-500" };
        }
      };
      
      if (calendarAction.type === "add") {
        // Add new event
        const newId = (Math.max(0, ...updatedEvents.map(e => parseInt(e.id) || 0)) + 1).toString();
        const { type, color } = getEventTypeAndColor(calendarAction.event.title);
        updatedEvents.push({
          id: newId,
          title: calendarAction.event.title,
          time: calendarAction.event.time,
          duration: calendarAction.event.duration,
          type,
          color
        });
        console.log("Added event:", calendarAction.event.title);
      } else if (calendarAction.type === "remove") {
        // Remove event by title and time
        const indexToRemove = updatedEvents.findIndex(e => 
          e.title === calendarAction.event.title && e.time === calendarAction.event.time
        );
        if (indexToRemove !== -1) {
          updatedEvents.splice(indexToRemove, 1);
          console.log("Removed event:", calendarAction.event.title);
        }
      } else if (calendarAction.type === "replace" && calendarAction.replaceWith) {
        // Find and replace event
        const indexToReplace = updatedEvents.findIndex(e => 
          e.title === calendarAction.event.title || 
          e.title.includes(calendarAction.event.title.split(" ")[0])
        );
        if (indexToReplace !== -1) {
          const { type, color } = getEventTypeAndColor(calendarAction.replaceWith.title);
          updatedEvents[indexToReplace] = {
            ...updatedEvents[indexToReplace],
            title: calendarAction.replaceWith.title,
            time: calendarAction.replaceWith.time,
            duration: calendarAction.replaceWith.duration,
            type,
            color
          };
          console.log("Replaced event:", calendarAction.event.title, "with", calendarAction.replaceWith.title);
        }
      }
      
      // Sort by time and return
      const sorted = updatedEvents.sort((a, b) => a.time.localeCompare(b.time));
      console.log("Updated events:", sorted);
      return sorted;
    });
    
    toast.success("Calendar updated", {
      description: `${calendarAction.type.toUpperCase()}: ${calendarAction.event.title}`,
    });
  };

  const handleAssignmentSchedule = (assignment: any, time: string, duration: number) => {
    // Create a calendar event for the assignment
    const newEvent: CalendarEvent = {
      id: (Math.max(0, ...calendarEvents.map(e => parseInt(e.id) || 0)) + 1).toString(),
      title: `Study: ${assignment.title}`,
      time: time,
      duration: duration,
      type: "study",
      color: "bg-indigo-500"
    };

    setCalendarEvents(prevEvents => {
      const updated = [...prevEvents, newEvent];
      return updated.sort((a, b) => a.time.localeCompare(b.time));
    });

    toast.success("Study time added to calendar", {
      description: `${duration} min for ${assignment.title} at ${time}`,
    });
  };

  // Show welcome page if not logged in
  if (!isLoggedIn) {
    return <WelcomePage onLogin={handleLogin} />;
  }

  // Show settings page
  if (showSettings) {
    return (
      <SettingsPage
        credentials={credentials}
        onSave={(newCreds) => {
          setCredentials(newCreds);
          setShowSettings(false);
          toast.success("Settings saved successfully");
        }}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                  {suggestions.length}
                </Badge>
              )}
            </Button>
            
            <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Quick Insight of the Day */}
        <div className="mb-6">
          <CommandCenter events={calendarEvents} userFocus={userFocus} />
        </div>

        {/* Kaisey Chatbot Widget - Prominent at Top */}
        <div className="mb-6">
          <KaiseyChatbot 
            onScheduleChange={handleScheduleChange} 
            onFocusChange={setUserFocus}
            variant="widget" 
          />
        </div>

        {/* My Recommendations */}
        {suggestions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold">My Recommendations</h3>
              <Badge variant="outline" className="text-xs">{suggestions.length}</Badge>
            </div>
            {suggestions.map((suggestion) => (
              <AgentSuggestion
                key={suggestion.id}
                type={suggestion.type}
                title={suggestion.title}
                description={suggestion.description}
                action={{
                  label: "Accept & Update Calendar",
                  onClick: () => handleAcceptSuggestion(suggestion.id),
                }}
                dismiss={() => handleDismissSuggestion(suggestion.id)}
              />
            ))}
          </div>
        )}

        {/* Main View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Calendar */}
          <div className="lg:col-span-2 space-y-6">
            <CalendarView events={calendarEvents} />
            <AssignmentGrid onScheduleTime={handleAssignmentSchedule} />
          </div>

          {/* Right Column - Metrics */}
          <div className="space-y-6">
            <ProfileSection />
            <HealthMetrics />
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}