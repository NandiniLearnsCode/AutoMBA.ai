import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Button } from "@/app/components/ui/button";
import { ScheduleAssignmentDialog } from "./ScheduleAssignmentDialog";
import { useState, useEffect } from "react";
import { useMcpServer } from "@/hooks/useMcpServer";
import { format, parseISO, isPast, isToday, addDays } from "date-fns";

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

// Default assignments (fallback)
const defaultAssignments: Assignment[] = [
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
];

// Convert Canvas assignment to our format
function convertCanvasAssignment(canvasAssignment: any): Assignment | null {
  try {
    // Handle different date formats from Canvas
    let dueDate: Date | null = null;
    if (canvasAssignment.due_at) {
      try {
        dueDate = parseISO(canvasAssignment.due_at);
      } catch (e) {
        console.warn('Error parsing due date:', canvasAssignment.due_at);
      }
    }
    
    const submission = canvasAssignment.submission;
    
    // Determine status and progress
    let status: "not-started" | "in-progress" | "completed" = "not-started";
    let progress = 0;
    
    if (submission) {
      if (submission.workflow_state === 'submitted' || submission.workflow_state === 'graded') {
        status = "completed";
        progress = 100;
      } else if (submission.workflow_state === 'unsubmitted' && submission.submitted_at) {
        status = "in-progress";
        progress = 50; // Estimate
      } else if (submission.workflow_state === 'unsubmitted' && submission.body) {
        // Has some work started
        status = "in-progress";
        progress = 25; // Estimate
      }
    }
    
    // Check if assignment has been submitted based on submission status
    if (canvasAssignment.submission?.workflow_state === 'submitted' || 
        canvasAssignment.submission?.workflow_state === 'graded') {
      status = "completed";
      progress = 100;
    }
    
    // Calculate priority based on due date
    let priority: "high" | "medium" | "low" = "low";
    if (dueDate) {
      const now = new Date();
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilDue < 24) priority = "high";
      else if (hoursUntilDue < 72) priority = "medium";
    }
    
    // Format due date
    let dueDateStr = "No due date";
    if (dueDate) {
      if (isPast(dueDate) && !isToday(dueDate)) {
        dueDateStr = format(dueDate, "MMM d, h:mm a") + " (Past due)";
      } else if (isToday(dueDate)) {
        dueDateStr = `Today, ${format(dueDate, "h:mm a")}`;
      } else {
        dueDateStr = format(dueDate, "MMM d, h:mm a");
      }
    }
    
    // Estimate time remaining
    let estimatedTime = "Time TBD";
    if (dueDate && !isPast(dueDate)) {
      const hoursRemaining = (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      if (hoursRemaining < 1) {
        estimatedTime = `${Math.round(hoursRemaining * 60)}min remaining`;
      } else if (hoursRemaining < 24) {
        estimatedTime = `${Math.round(hoursRemaining)}h remaining`;
      } else {
        estimatedTime = `${Math.round(hoursRemaining / 24)} days remaining`;
      }
    } else if (status === "completed") {
      estimatedTime = "Completed";
    }
    
    return {
      id: canvasAssignment.id.toString(),
      title: canvasAssignment.name || "Untitled Assignment",
      course: canvasAssignment.course_name || canvasAssignment.course_code || "Unknown Course",
      dueDate: dueDateStr,
      priority,
      progress,
      estimatedTime,
      status,
    };
  } catch (error) {
    console.error('Error converting Canvas assignment:', error);
    return null;
  }
}

export function AssignmentGrid() {
  const { connected, callTool, connect, loading } = useMcpServer('canvas');
  const [assignments, setAssignments] = useState<Assignment[]>(defaultAssignments);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Fetch Canvas assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!connected) {
        await connect();
        return;
      }

      try {
        setLoadingAssignments(true);
        console.log('Fetching Canvas assignments...');
        const response = await callTool('list_user_assignments', {});
        
        console.log('Canvas API response:', response);
        
        // Parse the response - MCP returns content array with text items
        let canvasAssignments: any[] = [];
        
        if (Array.isArray(response)) {
          // Look for text content in the response
          const textContent = response.find((item: any) => item.type === 'text');
          if (textContent?.text) {
            try {
              const parsed = JSON.parse(textContent.text);
              // Canvas API returns an array of assignments
              canvasAssignments = Array.isArray(parsed) ? parsed : [parsed];
              console.log(`Found ${canvasAssignments.length} Canvas assignments`);
            } catch (e) {
              console.error('Error parsing Canvas assignments JSON:', e);
              console.error('Raw text:', textContent.text);
            }
          } else if (response.length > 0) {
            // Check if response is already an array of assignments
            const firstItem = response[0];
            if (typeof firstItem === 'object' && ('id' in firstItem || 'name' in firstItem)) {
              canvasAssignments = response;
              console.log(`Found ${canvasAssignments.length} Canvas assignments (direct array)`);
            }
          }
        } else if (response && typeof response === 'object') {
          // Handle case where response is a single object with content array
          if (response.content && Array.isArray(response.content)) {
            const textContent = response.content.find((item: any) => item.type === 'text');
            if (textContent?.text) {
              try {
                const parsed = JSON.parse(textContent.text);
                canvasAssignments = Array.isArray(parsed) ? parsed : [parsed];
                console.log(`Found ${canvasAssignments.length} Canvas assignments (from content)`);
              } catch (e) {
                console.error('Error parsing Canvas assignments from content:', e);
              }
            }
          }
        }

        // Convert to our format and filter out nulls
        const converted = canvasAssignments
          .map(convertCanvasAssignment)
          .filter((a): a is Assignment => a !== null);

        console.log(`Converted ${converted.length} assignments to display format`);

        // Sort by priority and due date
        converted.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          // If same priority, sort alphabetically by title
          return a.title.localeCompare(b.title);
        });

        if (converted.length > 0) {
          console.log('Setting assignments:', converted);
          setAssignments(converted);
        } else {
          console.warn('No assignments found or converted. Keeping default assignments.');
        }
      } catch (error) {
        console.error('Error fetching Canvas assignments:', error);
        // Keep default assignments on error
      } finally {
        setLoadingAssignments(false);
      }
    };

    if (connected) {
      fetchAssignments();
    }
  }, [connected, callTool, connect]);

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
        <div className="flex items-center gap-2">
          {loadingAssignments && (
            <Badge variant="outline" className="text-xs">Loading...</Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {assignments.filter((a) => a.status !== "completed").length} Active
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {assignments.length === 0 && !loadingAssignments && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No assignments found.</p>
            <p className="text-xs mt-1">Make sure Canvas is connected and you have active assignments.</p>
          </div>
        )}
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
