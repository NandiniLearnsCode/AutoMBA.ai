import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: number;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting";
  color: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

const weekEvents: { [key: string]: CalendarEvent[] } = {
  Mon: [
    { id: "w1", title: "Corporate Finance", time: "08:00", duration: 90, type: "class", color: "bg-blue-500" },
    { id: "w2", title: "Case Study Prep", time: "14:00", duration: 120, type: "study", color: "bg-indigo-500" },
  ],
  Tue: [],
  Wed: [
    { id: "w3", title: "Marketing Strategy", time: "09:00", duration: 90, type: "class", color: "bg-blue-500" },
    { id: "w4", title: "BCG Coffee Chat", time: "15:00", duration: 45, type: "networking", color: "bg-orange-500" },
  ],
  Thu: [
    { id: "w5", title: "Operations Mgmt", time: "10:00", duration: 90, type: "class", color: "bg-blue-500" },
    { id: "w6", title: "Consulting Workshop", time: "13:00", duration: 120, type: "recruiting", color: "bg-red-500" },
  ],
  Fri: [
    { id: "w7", title: "Valuation", time: "08:00", duration: 90, type: "class", color: "bg-blue-500" },
    { id: "w8", title: "Study Group", time: "16:00", duration: 90, type: "study", color: "bg-indigo-500" },
  ],
};

export function CalendarView({ events }: CalendarViewProps) {
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Use events prop for today's view
  const todayEvents = events;
  
  // Update week events to use the passed events for Wednesday
  weekEvents.Wed = todayEvents;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000 * (view === "month" ? 30 : view === "week" ? 7 : 1)))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {view === "day" ? "Wednesday, Jan 21, 2026" : view === "week" ? "Jan 19-25, 2026" : formatMonth(currentDate)}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000 * (view === "month" ? 30 : view === "week" ? 7 : 1)))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week" | "month")} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>

        {/* Day View */}
        <TabsContent value="day" className="space-y-2">
          <div className="max-h-[500px] overflow-y-auto">
            {todayEvents.map((event) => (
              <div key={event.id} className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="text-sm text-muted-foreground font-mono w-16">{event.time}</div>
                <div className={`w-1 rounded-full ${event.color}`}></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{event.title}</h4>
                  <p className="text-xs text-muted-foreground">{event.duration} min • {event.type}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Week View */}
        <TabsContent value="week">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 gap-2 min-w-[800px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="border rounded-lg p-2">
                  <div className="font-semibold text-sm mb-2 pb-2 border-b">
                    {day}
                    {day === "Wed" && <Badge variant="outline" className="ml-1 text-xs">Today</Badge>}
                  </div>
                  <div className="space-y-2">
                    {weekEvents[day]?.map((event) => (
                      <div key={event.id} className={`p-2 rounded text-xs ${event.color} text-white`}>
                        <div className="font-semibold truncate">{event.title}</div>
                        <div className="opacity-90">{event.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Month View */}
        <TabsContent value="month">
          <div className="border rounded-lg">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {daysOfWeek.map((day) => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {getDaysInMonth(currentDate).map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[80px] p-2 border-r border-b last:border-r-0 ${
                    day ? "hover:bg-muted/50 cursor-pointer" : "bg-muted/20"
                  } ${day === 21 ? "bg-blue-500/10 border-blue-500" : ""}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-1 ${day === 21 ? "text-blue-500" : ""}`}>
                        {day}
                      </div>
                      {day === 21 && (
                        <div className="space-y-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}