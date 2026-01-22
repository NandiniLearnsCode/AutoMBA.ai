"use client";

import { useState } from "react";
import { Calendar, Clock, BookOpen } from "lucide-react";
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
  const { connected, callTool, connect } = useMcpServer('google-calendar');

  const handleSchedule = async () => {
    try {
      if (!connected) {
        await connect();
      }

      // Parse start time and create event for today (Jan 21, 2026)
      const today = getToday();
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(today);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = addMinutes(startDate, duration[0]);

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
      // Error handling could be added here (toast, etc.)
    }
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
              onChange={(e) => setStartTime(e.target.value)}
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
              onValueChange={setDuration}
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
