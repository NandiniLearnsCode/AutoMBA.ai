import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Button } from "@/app/components/ui/button";
import { ScheduleAssignmentDialog } from "./ScheduleAssignmentDialog";
import { useState } from "react";

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

const assignments: Assignment[] = [
  {
    id: "1",
    title: "Valuation Case Study",
    course: "Corporate Finance",
    dueDate: "Jan 22, 11:59 PM",
    priority: "high",
    progress: 35,
    estimatedTime: "4h remaining",
    status: "in-progress",
  },
  {
    id: "2",
    title: "Strategy Canvas Quiz",
    course: "Business Strategy",
    dueDate: "Jan 20, 11:00 AM",
    priority: "high",
    progress: 100,
    estimatedTime: "Completed",
    status: "completed",
  },
  {
    id: "3",
    title: "Marketing Mix Analysis",
    course: "Marketing Analytics",
    dueDate: "Jan 24, 5:00 PM",
    priority: "medium",
    progress: 60,
    estimatedTime: "2h remaining",
    status: "in-progress",
  },
  {
    id: "4",
    title: "Ethics Discussion Post",
    course: "Business Ethics",
    dueDate: "Jan 25, 11:59 PM",
    priority: "low",
    progress: 0,
    estimatedTime: "30min estimated",
    status: "not-started",
  },
  {
    id: "5",
    title: "Operations Group Project",
    course: "Operations Management",
    dueDate: "Jan 23, 9:00 AM",
    priority: "high",
    progress: 20,
    estimatedTime: "6h remaining",
    status: "in-progress",
  },
];

export function AssignmentGrid() {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const priorityColors = {
    high: "border-red-500/50 bg-red-500/5",
    medium: "border-yellow-500/50 bg-yellow-500/5",
    low: "border-gray-500/50 bg-gray-500/5",
  };

  const handleScheduleClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setDialogOpen(true);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Canvas Assignments</h3>
        <Badge variant="outline" className="text-xs">
          {assignments.filter((a) => a.status !== "completed").length} Active
        </Badge>
      </div>

      <div className="space-y-3">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className={`rounded-lg border-2 p-3 ${priorityColors[assignment.priority]} ${
              assignment.status === "completed" ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-0.5">{assignment.title}</h4>
                <p className="text-xs text-muted-foreground">{assignment.course}</p>
              </div>
              <Badge
                variant={assignment.priority === "high" ? "destructive" : "outline"}
                className="text-xs shrink-0"
              >
                {assignment.priority}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Calendar className="w-3 h-3" />
              <span>{assignment.dueDate}</span>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{assignment.estimatedTime}</span>
            </div>

            {assignment.status !== "completed" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{assignment.progress}%</span>
                </div>
                <Progress value={assignment.progress} className="h-1.5" />
              </div>
            )}

            {assignment.status === "completed" && (
              <div className="text-xs text-green-500 font-semibold">✓ Completed</div>
            )}
          </div>
        ))}
      </div>

      {/* Schedule Dialog */}
      {selectedAssignment && (
        <ScheduleAssignmentDialog
          assignment={selectedAssignment}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            // Could refresh assignments or show success message
          }}
        />
      )}
    </Card>
  );
}
