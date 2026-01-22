import { Calendar, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Button } from "@/app/components/ui/button";
import { ScheduleAssignmentDialog } from "./ScheduleAssignmentDialog";
import { useState, useEffect, useRef, useCallback } from "react";
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

// Simplified response parser - optimized for performance
function parseCanvasResponse(response: any): any[] {
  // Fast path: response is already an array of assignments
  if (Array.isArray(response)) {
    const firstItem = response[0];
    // Check if it's an array of assignments (has id or name) or content items
    if (firstItem && typeof firstItem === 'object') {
      if ('id' in firstItem || 'name' in firstItem) {
        return response; // Direct array of assignments
      }
      // It's content items, find text content
      const textContent = response.find((item: any) => item.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      }
    }
    return [];
  }
  
  // Handle object with content array
  if (response?.content && Array.isArray(response.content)) {
    const textContent = response.content.find((item: any) => item.type === 'text');
    if (textContent?.text) {
      try {
        const parsed = JSON.parse(textContent.text);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
  }
  
  return [];
}

export function AssignmentGrid() {
  const { connected, callTool, connect, loading, error: connectionError } = useMcpServer('canvas');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [hasTriedFetch, setHasTriedFetch] = useState(false);
  
  // Use refs to prevent duplicate fetches and track fetch status
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const assignmentsCountRef = useRef<number>(0);
  const CACHE_DURATION = 30000; // Cache for 30 seconds

  // Memoized fetch function
  const fetchAssignments = useCallback(async (force = false) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      return;
    }

    // Check cache (unless forced refresh)
    const now = Date.now();
    if (!force && assignmentsCountRef.current > 0 && (now - lastFetchTimeRef.current) < CACHE_DURATION) {
      return;
    }

    // Only fetch if connected
    if (!connected) {
      // Try to connect if not connected and not loading
      if (!loading) {
        try {
          await connect();
          // Connection will trigger useEffect to fetch
          return;
        } catch (err) {
          console.error('Failed to connect to Canvas:', err);
          setHasTriedFetch(true);
          return;
        }
      }
      return;
    }

    fetchingRef.current = true;
    setLoadingAssignments(true);
    setHasTriedFetch(true);

    try {
      const startTime = Date.now();
      console.log('🚀 Fetching Canvas assignments...');
      
      const response = await callTool('list_user_assignments', {});
      
      // Parse response (optimized)
      const canvasAssignments = parseCanvasResponse(response);
      console.log(`✅ Found ${canvasAssignments.length} Canvas assignments in ${Date.now() - startTime}ms`);

      // Convert to our format and filter out nulls
      const converted = canvasAssignments
        .map(convertCanvasAssignment)
        .filter((a): a is Assignment => a !== null);

      // Sort by priority and due date
      converted.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.title.localeCompare(b.title);
      });

      setAssignments(converted);
      assignmentsCountRef.current = converted.length;
      lastFetchTimeRef.current = Date.now();
      
      if (converted.length === 0 && canvasAssignments.length === 0) {
        console.warn('⚠️ No Canvas assignments found.');
      }
    } catch (error: any) {
      console.error('❌ Error fetching Canvas assignments:', error);
      setAssignments([]);
      assignmentsCountRef.current = 0;
    } finally {
      setLoadingAssignments(false);
      fetchingRef.current = false;
    }
  }, [connected, loading, callTool, connect]);

  // Fetch assignments when connected
  useEffect(() => {
    if (connected && !hasTriedFetch) {
      fetchAssignments();
    }
  }, [connected, hasTriedFetch, fetchAssignments]);

  const priorityColors = {
    high: "border-red-500/50 bg-red-500/5",
    medium: "border-yellow-500/50 bg-yellow-500/5",
    low: "border-gray-500/50 bg-gray-500/5",
  };

  const handleScheduleClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setDialogOpen(true);
  };

  const handleRefresh = useCallback(async () => {
    await fetchAssignments(true); // Force refresh
  }, [fetchAssignments]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Canvas Assignments</h3>
        <div className="flex items-center gap-2">
          {loadingAssignments && (
            <Badge variant="outline" className="text-xs">Loading...</Badge>
          )}
          {connected && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Connected
            </Badge>
          )}
          {!connected && !loading && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
              Not Connected
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {assignments.filter((a) => a.status !== "completed").length} Active
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={loadingAssignments}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAssignments ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {connectionError && (
          <div className="text-center py-4 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
            <p className="font-semibold">Connection Error</p>
            <p className="text-xs mt-1">{connectionError}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2"
              onClick={() => connect()}
            >
              Retry Connection
            </Button>
          </div>
        )}
        {assignments.length === 0 && !loadingAssignments && hasTriedFetch && !connectionError && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No assignments found.</p>
            <p className="text-xs mt-1">Make sure Canvas is connected and you have active assignments.</p>
            <p className="text-xs mt-1">Check browser console (F12) for details.</p>
          </div>
        )}
        {assignments.length === 0 && !hasTriedFetch && !loadingAssignments && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>Connecting to Canvas...</p>
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
