import { useState } from "react";
import { Brain, LayoutGrid, LineChart, Heart, Bell, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Toaster } from "@/app/components/ui/sonner";
import { CommandCenter } from "@/app/components/CommandCenter";
import { AgentSuggestion } from "@/app/components/AgentSuggestion";
import { TimelineView } from "@/app/components/TimelineView";
import { HealthMetrics } from "@/app/components/HealthMetrics";
import { AssignmentGrid } from "@/app/components/AssignmentGrid";
import { NetworkingLedger } from "@/app/components/NetworkingLedger";
import { WeeklyStrategy } from "@/app/components/WeeklyStrategy";
import { ROIDashboard } from "@/app/components/ROIDashboard";
import { NexusChatbot } from "@/app/components/NexusChatbot";
import { Settings } from "@/app/components/Settings";
import { useGoogleCalendarAuth } from "@/hooks/useGoogleCalendarAuth";
import { toast } from "sonner";

export default function App() {
  // Initialize Google Calendar authentication on app load
  useGoogleCalendarAuth();
  
  const [viewMode, setViewMode] = useState<"focus" | "strategy" | "recovery">("focus");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([
    {
      id: "1",
      type: "conflict" as const,
      title: "Schedule Conflict Detected",
      description: "Goldman Sachs Info Session overlaps with your scheduled gym session at 12:00 PM. Low HRV indicates you need recovery time.",
    },
    {
      id: "2",
      type: "optimization" as const,
      title: "Time Block Optimization Available",
      description: "Based on your biometrics (5.2h sleep, low HRV), I can move the Valuation Case Study deep work to tomorrow morning when your cognitive performance is typically 34% higher.",
    },
  ]);

  const handleAcceptSuggestion = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
    toast.success("Calendar updated successfully", {
      description: "Your schedule has been optimized by Nexus Agent.",
    });
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
  };

  const handleScheduleChange = (action: string, details: any) => {
    toast.success("Schedule updated", {
      description: `${details}`,
    });
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "focus":
        return "bg-blue-500";
      case "strategy":
        return "bg-purple-500";
      case "recovery":
        return "bg-green-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Nexus</h1>
              <p className="text-xs text-muted-foreground">MBA Co-Pilot</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              <Button
                size="sm"
                variant={viewMode === "focus" ? "default" : "ghost"}
                onClick={() => setViewMode("focus")}
                className="text-xs h-8"
              >
                Focus
              </Button>
              <Button
                size="sm"
                variant={viewMode === "strategy" ? "default" : "ghost"}
                onClick={() => setViewMode("strategy")}
                className="text-xs h-8"
              >
                Strategy
              </Button>
              <Button
                size="sm"
                variant={viewMode === "recovery" ? "default" : "ghost"}
                onClick={() => setViewMode("recovery")}
                className="text-xs h-8"
              >
                Recovery
              </Button>
            </div>

            <Button size="sm" variant="outline" className="relative">
              <Bell className="w-4 h-4" />
              {suggestions.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Command Center */}
        <div className="mb-6">
          <CommandCenter />
        </div>

        {/* Agent Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold">Agent Recommendations</h3>
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

        {/* View Modes */}
        {viewMode === "focus" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <TimelineView />
              <AssignmentGrid />
            </div>

            {/* Right Column - Metrics & CRM */}
            <div className="space-y-6">
              <HealthMetrics />
              <NetworkingLedger />
            </div>
          </div>
        )}

        {viewMode === "strategy" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Weekly View */}
            <div className="lg:col-span-2 space-y-6">
              <WeeklyStrategy />
              <ROIDashboard />
              <AssignmentGrid />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <NetworkingLedger />
              <HealthMetrics />
            </div>
          </div>
        )}

        {viewMode === "recovery" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Health Focus */}
            <div className="lg:col-span-2 space-y-6">
              <HealthMetrics />
              <TimelineView />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-6">
                <div className="text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="font-semibold mb-2">Recovery Mode</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your health metrics indicate you need rest. The agent has suggested moving non-critical tasks.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Recommended Sleep</span>
                      <span className="font-semibold">8+ hours</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Active Recovery</span>
                      <span className="font-semibold">Light walk</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Stress Level</span>
                      <span className="font-semibold text-yellow-500">Elevated</span>
                    </div>
                  </div>
                </div>
              </div>
              <AssignmentGrid />
            </div>
          </div>
        )}
      </main>

      {/* Mode Indicator */}
      <div className="fixed bottom-6 right-6">
        <div className={`px-4 py-2 rounded-full ${getModeColor(viewMode)} text-white shadow-lg flex items-center gap-2`}>
          {viewMode === "focus" && <LayoutGrid className="w-4 h-4" />}
          {viewMode === "strategy" && <LineChart className="w-4 h-4" />}
          {viewMode === "recovery" && <Heart className="w-4 h-4" />}
          <span className="text-sm font-semibold capitalize">{viewMode} Mode</span>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster />

      {/* Nexus Chatbot */}
      <NexusChatbot onScheduleChange={handleScheduleChange} />
    </div>
  );
}