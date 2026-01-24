"use client";

import { useState } from "react";
import { Calendar, Clock, BookOpen, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Slider } from "@/app/components/ui/slider";
import { useMcpServer } from "@/hooks/useMcpServer";
import { useCalendar } from "@/contexts/CalendarContext";
import { getToday } from "@/utils/dateUtils";
import { addMinutes, format } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  progress: number;
  estimatedTime: string;
  status: "not-started" | "in-progress" | "completed";
}

interface ScheduleAssignmentDialogProps {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleAssignmentDialog({
  assignment,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleAssignmentDialogProps) {
  const [startTime, setStartTime] = useState("09:00"); // Default 9 AM
  const [duration, setDuration] = useState([120]); // Default 2 hours in minutes
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const { connected, callTool, connect } = useMcpServer('google-calendar');
  const { events: calendarEvents } = useCalendar();

  // Helper function to find available time slots based on activity type
  const findAvailableSlots = (
    targetDate: Date,
    durationMinutes: number
  ): { time: string; label: string }[] => {
    const slots: { time: string; label: string }[] = [];

    // Study-focused time ranges
    const preferredRanges = [
      { start: 9, end: 12, label: "Morning" },
      { start: 14, end: 17, label: "Afternoon" },
      { start: 19, end: 22, label: "Evening" },
    ];

    // Get busy times for the target date
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    const busySlots = calendarEvents
      .filter(e => e.startDate && format(e.startDate, 'yyyy-MM-dd') === targetDateStr)
      .map(e => ({
        start: e.startDate.getHours() * 60 + e.startDate.getMinutes(),
        end: (e.endDate || e.startDate).getHours() * 60 + (e.endDate || e.startDate).getMinutes() + (e.endDate ? 0 : e.duration),
      }));

    // Find available slots in preferred ranges
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

  const handleSchedule = async () => {
    try {
      if (!connected) {
        await connect();
      }

      // Parse start time and create event for today (system date)
      const today = getToday();
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(today);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = addMinutes(startDate, duration[0]);

      // Check for conflicts before creating the event
      const eventStart = startDate.getTime();
      const eventEnd = endDate.getTime();
      const conflictingEvent = calendarEvents.find(existingEvent => {
        if (!existingEvent.startDate || !existingEvent.endDate) return false;
        const existingStart = existingEvent.startDate.getTime();
        const existingEnd = existingEvent.endDate.getTime();
        return (eventStart < existingEnd && eventEnd > existingStart);
      });

      if (conflictingEvent) {
        // Find alternative time slots
        const alternativeSlots = findAvailableSlots(startDate, duration[0]);

        let message = `This time conflicts with "${conflictingEvent.title}" at ${conflictingEvent.time}.`;
        if (alternativeSlots.length > 0) {
          message += `\n\nSuggested times:\n${alternativeSlots.map((s, i) => `${i + 1}. ${s.label}`).join('\n')}`;
        }
        setConflictMessage(message);
        return;
      }

      // Clear any previous conflict message
      setConflictMessage(null);

      // Create calendar event via MCP
      await callTool('create_event', {
        calendarId: 'primary',
        summary: `${assignment.title} - ${assignment.course}`,
        description: `Study session for ${assignment.course} assignment. Due: ${assignment.dueDate}`,
        start: {
          dateTime: startDate.toISOString(),
        },
        end: {
          dateTime: endDate.toISOString(),
        },
      });

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error scheduling assignment:', error);
      setConflictMessage('Failed to create event. Please try again.');
    }
  };

  // Clear conflict message when time or duration changes
  const handleTimeChange = (newTime: string) => {
    setStartTime(newTime);
    setConflictMessage(null);
  };

  const handleDurationChange = (newDuration: number[]) => {
    setDuration(newDuration);
    setConflictMessage(null);
  };

  // Format duration for display
  const durationHours = Math.floor(duration[0] / 60);
  const durationMinutes = duration[0] % 60;
  const durationText = durationHours > 0 
    ? `${durationHours}h ${durationMinutes > 0 ? `${durationMinutes}m` : ''}`.trim()
    : `${durationMinutes}m`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Schedule Study Time
          </DialogTitle>
          <DialogDescription>
            Block time in your calendar for this assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Assignment Metadata (Read-only) */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Assignment</Label>
            </div>
            <div className="font-semibold">{assignment.title}</div>
            <div className="text-sm text-muted-foreground">{assignment.course}</div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Due: {assignment.dueDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{assignment.estimatedTime}</span>
              </div>
            </div>
          </div>

          {/* Start Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Duration Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <span className="text-sm font-semibold">{durationText}</span>
            </div>
            <Slider
              value={duration}
              onValueChange={handleDurationChange}
              min={15}
              max={480}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 min</span>
              <span>8 hours</span>
            </div>
          </div>

          {/* Conflict Message */}
          {conflictMessage && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-line">
                  {conflictMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          >
            Add to Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
