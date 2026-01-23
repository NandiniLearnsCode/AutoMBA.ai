import { useState, useEffect, useCallback } from "react";
import { Clock, Users, BookOpen, Dumbbell, Coffee, Briefcase, GraduationCap, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/app/components/ui/toggle-group";
import { useMcpServer } from "@/hooks/useMcpServer";
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isSameMonth } from "date-fns";
import { getToday, isToday as isTodayGlobal } from "@/utils/dateUtils";
import { useCalendar } from "@/contexts/CalendarContext";

interface TimeBlock {
  id: string;
  time: string;
  duration: number;
  title: string;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer";
  status: "completed" | "current" | "upcoming" | "suggested";
  location?: string;
  priority: "hard-block" | "flexible" | "optional";
  // Store original dates for updates
  startDate: Date;
  endDate: Date;
}

const typeConfig = {
  class: { icon: GraduationCap, color: "bg-blue-500" },
  meeting: { icon: Users, color: "bg-purple-500" },
  study: { icon: BookOpen, color: "bg-indigo-500" }, // Indigo theme for study events
  workout: { icon: Dumbbell, color: "bg-green-500" },
  networking: { icon: Coffee, color: "bg-orange-500" },
  recruiting: { icon: Briefcase, color: "bg-red-500" },
  buffer: { icon: Clock, color: "bg-gray-400" },
};

// Draggable Event Component (for Day View)
function DraggableEvent({ block, index, isLast, typeConfig }: { block: TimeBlock; index: number; isLast: boolean; typeConfig: typeof typeConfig }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: block,
  });

  const config = typeConfig[block.type];
  const Icon = config.icon;
  const style = transform ? {
    transform: `translateY(${transform.y}px)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} className={`relative flex gap-4 ${!isLast ? "mb-6" : ""} ${isDragging ? "opacity-50 z-50" : ""}`}>
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

      {/* Content - Draggable */}
      <div className="flex-1 pb-6" {...listeners} {...attributes} style={{ cursor: 'grab' }}>
        <div
          className={`rounded-lg border-l-4 border p-3 ${
            block.type === "class" ? "border-l-blue-500" :
            block.type === "meeting" ? "border-l-purple-500" :
            block.type === "study" ? "border-l-indigo-500" :
            block.type === "workout" ? "border-l-green-500" :
            block.type === "networking" ? "border-l-orange-500" :
            block.type === "recruiting" ? "border-l-red-500" :
            "border-l-gray-400"
          } ${
            block.status === "current" ? "border-blue-500 bg-blue-500/5" : ""
          } ${block.status === "completed" ? "opacity-50" : ""} ${
            block.status === "suggested" ? "border-green-500 border-dashed bg-green-500/5" : ""
          } ${isDragging ? "shadow-lg" : ""}`}
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
}

// Week View Component
function WeekView({ timeBlocks, currentDate, typeConfig }: { timeBlocks: TimeBlock[]; currentDate: Date; typeConfig: typeof typeConfig }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
  
  // Group events by day
  const eventsByDay = weekDays.map(day => ({
    date: day,
    events: timeBlocks.filter(block => isSameDay(block.startDate, day))
  }));

  return (
    <div className="grid grid-cols-7 gap-2">
      {eventsByDay.map(({ date, events }) => (
        <div key={date.toISOString()} className="border rounded-lg p-2 min-h-[200px]">
          <div className={`text-xs font-semibold mb-2 ${isTodayGlobal(date) ? 'text-blue-500' : 'text-muted-foreground'}`}>
            {format(date, 'EEE')}
          </div>
          <div className={`text-sm font-bold mb-2 ${isTodayGlobal(date) ? 'text-blue-500' : ''}`}>
            {format(date, 'd')}
          </div>
          <div className="space-y-1">
            {events.map(block => {
              const config = typeConfig[block.type];
              const Icon = config.icon;
              return (
                <div
                  key={block.id}
                  className={`rounded p-1.5 text-xs ${config.color} text-white truncate cursor-pointer hover:opacity-80`}
                  title={block.title}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{block.time}</span>
                  </div>
                  <div className="truncate">{block.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Month View Component
function MonthView({ timeBlocks, currentDate, typeConfig }: { timeBlocks: TimeBlock[]; currentDate: Date; typeConfig: typeof typeConfig }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Group events by day
  const eventsByDay = new Map<string, TimeBlock[]>();
  timeBlocks.forEach(block => {
    const dateKey = format(block.startDate, 'yyyy-MM-dd');
    if (!eventsByDay.has(dateKey)) {
      eventsByDay.set(dateKey, []);
    }
    eventsByDay.get(dateKey)!.push(block);
  });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-2">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isCurrentDay = isTodayGlobal(date);
            
            return (
              <div
                key={date.toISOString()}
                className={`border rounded-lg p-1.5 min-h-[80px] ${
                  !isCurrentMonth ? 'opacity-30' : ''
                } ${isCurrentDay ? 'border-blue-500 bg-blue-50/50' : ''}`}
              >
                <div className={`text-xs font-semibold mb-1 ${isCurrentDay ? 'text-blue-500' : 'text-muted-foreground'}`}>
                  {format(date, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(block => {
                    const config = typeConfig[block.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={block.id}
                        className={`rounded px-1 py-0.5 text-[10px] ${config.color} text-white truncate`}
                        title={`${block.time} - ${block.title}`}
                      >
                        <div className="flex items-center gap-0.5">
                          <Icon className="w-2 h-2 shrink-0" />
                          <span className="truncate">{block.title}</span>
                        </div>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function TimelineView() {
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState(() => getToday());
  const { loading: calendarLoading, error: calendarError, getEvents, fetchEvents } = useCalendar();
  const { connected, loading: mcpLoading, error: mcpError, callTool, connect } = useMcpServer('google-calendar');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadCalendarEvents = useCallback(async () => {
    let startDate: Date;
    let endDate: Date;

    if (view === 'day') {
      startDate = startOfDay(currentDate);
      endDate = endOfDay(currentDate);
    } else if (view === 'week') {
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else { // month
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    }
    await fetchEvents(startDate, endDate);
    // Only depend on view and currentDate - fetchEvents is stable from useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate]);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  const timeBlocks = getEvents(
    view === 'day' ? startOfDay(currentDate) : view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate),
    view === 'day' ? endOfDay(currentDate) : view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate)
  );

  const formatDateRange = () => {
    if (view === 'day') {
      return format(currentDate, 'EEEE, MMM d, yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };
  
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      if (view === 'day') {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        return newDate;
      } else if (view === 'week') {
        return direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
      } else {
        return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
      }
    });
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active.data.current || !delta) return;
    
    const block = active.data.current as TimeBlock;
    const minutesDelta = Math.round(delta.y / 2); // Adjust sensitivity (2px per minute)
    
    if (minutesDelta === 0) return;
    
    try {
      const newStart = new Date(block.startDate);
      newStart.setMinutes(newStart.getMinutes() + minutesDelta);
      const newEnd = new Date(block.endDate);
      newEnd.setMinutes(newEnd.getMinutes() + minutesDelta);
      
      await callTool('update_event', {
        calendarId: 'primary',
        eventId: block.id,
        start: {
          dateTime: newStart.toISOString(),
        },
        end: {
          dateTime: newEnd.toISOString(),
        },
      });
      
      await loadCalendarEvents();
    } catch (err: any) {
      console.error('Error updating event:', err);
    }
  };

  const isLoading = calendarLoading || mcpLoading;

  if (isLoading && timeBlocks.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">
            {connected ? 'Loading calendar...' : 'Connecting to calendar...'}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Calendar</h3>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "day" | "week" | "month")} size="sm" variant="outline">
            <ToggleGroupItem value="day" aria-label="Day view">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Week view">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Month view">
              Month
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateDate('prev')}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const today = getToday();
              setCurrentDate(today);
            }}
            className="h-7 px-2 text-xs"
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateDate('next')}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[140px] text-right">{formatDateRange()}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadCalendarEvents}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {(calendarError || mcpError) && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-600">{calendarError || mcpError}</p>
        </div>
      )}

      {timeBlocks.length === 0 && !isLoading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No events scheduled {view === 'day' ? 'for this day' : view === 'week' ? 'for this week' : 'for this month'}
        </div>
      )}

      {/* Render based on view */}
      {view === 'day' && timeBlocks.length > 0 && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-border"></div>

            {timeBlocks.map((block, index) => (
              <DraggableEvent
                key={block.id}
                block={block}
                index={index}
                isLast={index === timeBlocks.length - 1}
                typeConfig={typeConfig}
              />
            ))}
          </div>
        </DndContext>
      )}

      {view === 'week' && timeBlocks.length > 0 && (
        <WeekView timeBlocks={timeBlocks} currentDate={currentDate} typeConfig={typeConfig} />
      )}

      {view === 'month' && timeBlocks.length > 0 && (
        <MonthView timeBlocks={timeBlocks} currentDate={currentDate} typeConfig={typeConfig} />
      )}
    </Card>
  );
}
