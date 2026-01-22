import { Calendar, Clock, AlertTriangle, RefreshCw, FileText, Megaphone, HelpCircle } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Button } from "@/app/components/ui/button";
import { ScheduleAssignmentDialog } from "./ScheduleAssignmentDialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMcpServer } from "@/hooks/useMcpServer";
import { format, parseISO, isPast, isToday, addDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { getToday } from "@/utils/dateUtils";

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

// Convert Canvas item (assignment, announcement, or quiz) to our format
function convertCanvasItem(canvasItem: any): CourseItem | null {
  try {
    const itemType = canvasItem.type || 'assignment';
    let dateField: Date | null = null;
    let dateFieldName = 'due_at';
    
    // Handle different date fields based on type
    if (itemType === 'announcement') {
      dateFieldName = 'posted_at';
      if (canvasItem.posted_at) {
        try {
          dateField = parseISO(canvasItem.posted_at);
        } catch (e) {
          // Try created_at if posted_at fails
          if (canvasItem.created_at) {
            try {
              dateField = parseISO(canvasItem.created_at);
            } catch (e2) {
              console.warn('Error parsing announcement date:', canvasItem.posted_at || canvasItem.created_at);
            }
          }
        }
      }
    } else {
      // Assignment or quiz - use due_at
      if (canvasItem.due_at) {
        try {
          dateField = parseISO(canvasItem.due_at);
        } catch (e) {
          console.warn('Error parsing due date:', canvasItem.due_at);
        }
      }
    }
    
    // Determine status and progress (only for assignments)
    let status: "not-started" | "in-progress" | "completed" = "not-started";
    let progress = 0;
    
    if (itemType === 'assignment' && canvasItem.submission) {
      const submission = canvasItem.submission;
      if (submission.workflow_state === 'submitted' || submission.workflow_state === 'graded') {
        status = "completed";
        progress = 100;
      } else if (submission.workflow_state === 'unsubmitted' && submission.submitted_at) {
        status = "in-progress";
        progress = 50;
      } else if (submission.workflow_state === 'unsubmitted' && submission.body) {
        status = "in-progress";
        progress = 25;
      }
    } else if (itemType === 'announcement') {
      // Announcements are informational, no status/progress
      status = "not-started";
      progress = 0;
    } else if (itemType === 'quiz') {
      // Quizzes don't have submission info in this endpoint
      status = "not-started";
      progress = 0;
    }
    
    // Calculate priority based on date
    let priority: "high" | "medium" | "low" = "low";
    if (dateField) {
      const now = new Date();
      const hoursUntilDue = (dateField.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilDue < 24) priority = "high";
      else if (hoursUntilDue < 72) priority = "medium";
    }
    
    // Format date
    let dateStr = "No date";
    if (dateField) {
      if (isPast(dateField) && !isToday(dateField)) {
        dateStr = format(dateField, "MMM d, h:mm a") + (itemType === 'assignment' || itemType === 'quiz' ? " (Past due)" : "");
      } else if (isToday(dateField)) {
        dateStr = `Today, ${format(dateField, "h:mm a")}`;
      } else {
        dateStr = format(dateField, "MMM d, h:mm a");
      }
    }
    
    // Estimate time remaining (only for assignments/quizzes with due dates)
    let estimatedTime = itemType === 'announcement' ? "Posted" : "Time TBD";
    if (dateField && (itemType === 'assignment' || itemType === 'quiz') && !isPast(dateField)) {
      const hoursRemaining = (dateField.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      if (hoursRemaining < 1) {
        estimatedTime = `${Math.round(hoursRemaining * 60)}min remaining`;
      } else if (hoursRemaining < 24) {
        estimatedTime = `${Math.round(hoursRemaining)}h remaining`;
      } else {
        estimatedTime = `${Math.round(hoursRemaining / 24)} days remaining`;
      }
    } else if (status === "completed") {
      estimatedTime = "Completed";
    } else if (itemType === 'announcement' && dateField) {
      estimatedTime = format(dateField, "MMM d");
    }
    
    return {
      id: canvasItem.id.toString(),
      title: canvasItem.name || canvasItem.title || "Untitled",
      course: canvasItem.course_name || canvasItem.course_code || "Unknown Course",
      dueDate: dateStr,
      priority,
      progress,
      estimatedTime,
      status,
      type: itemType,
    };
  } catch (error) {
    console.error('Error converting Canvas item:', error);
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
  const [items, setItems] = useState<CourseItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CourseItem | null>(null);
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
      
      const response = await callTool('list_user_course_items', {});
      
      // Parse response (optimized)
      const canvasItems = parseCanvasResponse(response);
      console.log(`✅ Found ${canvasItems.length} Canvas items in ${Date.now() - startTime}ms`);

      // Filter to show current month and future months only (exclude past months)
      const today = getToday();
      const monthStart = startOfMonth(today);
      monthStart.setHours(0, 0, 0, 0);
      
      // Filter Canvas items by date - show current month and future only
      const currentAndFutureItems = canvasItems.filter((canvasItem) => {
        // Get the appropriate date field based on type
        let itemDate: Date | null = null;
        
        if (canvasItem.type === 'announcement') {
          if (canvasItem.posted_at) {
            try {
              itemDate = parseISO(canvasItem.posted_at);
            } catch {
              if (canvasItem.created_at) {
                try {
                  itemDate = parseISO(canvasItem.created_at);
                } catch {}
              }
            }
          }
        } else {
          // Assignment or quiz - use due_at
          if (canvasItem.due_at) {
            try {
              itemDate = parseISO(canvasItem.due_at);
            } catch {}
          }
        }
        
        if (!itemDate) {
          // Include items without dates (they might be upcoming)
          return true;
        }
        
        // Include if date is in current month or future
        return itemDate >= monthStart;
      });
      
      const assignmentsCount = currentAndFutureItems.filter(i => i.type === 'assignment').length;
      const announcementsCount = currentAndFutureItems.filter(i => i.type === 'announcement').length;
      const quizzesCount = currentAndFutureItems.filter(i => i.type === 'quiz').length;
      console.log(`📅 Filtered to ${assignmentsCount} assignments, ${announcementsCount} announcements, ${quizzesCount} quizzes (current & future months)`);

      // Convert to our format and filter out nulls
      const converted = currentAndFutureItems
        .map(convertCanvasItem)
        .filter((a): a is CourseItem => a !== null);

      // Sort by priority and due date
      converted.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.title.localeCompare(b.title);
      });

      setItems(converted);
      assignmentsCountRef.current = converted.length;
      lastFetchTimeRef.current = Date.now();
      
      if (converted.length === 0 && currentAndFutureItems.length === 0) {
        console.warn(`⚠️ No Canvas items found for current and future months.`);
      }
    } catch (error: any) {
      console.error('❌ Error fetching Canvas items:', error);
      setItems([]);
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

  const handleScheduleClick = (item: CourseItem) => {
    if (item.type === 'assignment') {
      setSelectedItem(item);
      setDialogOpen(true);
    }
  };
  
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };
  
  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'Announcement';
      case 'quiz':
        return 'Quiz';
      default:
        return 'Assignment';
    }
  };

  const handleRefresh = useCallback(async () => {
    await fetchAssignments(true); // Force refresh
  }, [fetchAssignments]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Canvas Course Items</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Current & Future Months</p>
        </div>
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
            {items.filter((a) => a.status !== "completed").length} Active
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
        {items.length === 0 && !loadingAssignments && hasTriedFetch && !connectionError && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No course items found for current and future months.</p>
            <p className="text-xs mt-1">Make sure Canvas is connected and you have assignments, announcements, or quizzes.</p>
            <p className="text-xs mt-1">Check browser console (F12) for details.</p>
          </div>
        )}
        {items.length === 0 && !hasTriedFetch && !loadingAssignments && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>Connecting to Canvas...</p>
          </div>
        )}
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className={`rounded-lg border-2 p-3 ${priorityColors[item.priority]} ${
              item.status === "completed" ? "opacity-50" : ""
            } ${item.type === 'announcement' ? 'border-blue-500/50 bg-blue-500/5' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {getItemIcon(item.type)}
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{item.course}</p>
                  <Badge variant="outline" className="text-xs">
                    {getItemTypeLabel(item.type)}
                  </Badge>
                </div>
              </div>
              <Badge
                variant={item.priority === "high" ? "destructive" : "outline"}
                className="text-xs shrink-0"
              >
                {item.priority}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Calendar className="w-3 h-3" />
              <span>{item.dueDate}</span>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{item.estimatedTime}</span>
            </div>

            {item.type === 'assignment' && item.status !== "completed" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-1.5" />
              </div>
            )}

            {item.type === 'assignment' && item.status === "completed" && (
              <div className="text-xs text-green-500 font-semibold">✓ Completed</div>
            )}
          </div>
        ))}
      </div>

      {/* Schedule Dialog */}
      {selectedItem && selectedItem.type === 'assignment' && (
        <ScheduleAssignmentDialog
          assignment={selectedItem as any}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            // Could refresh items or show success message
          }}
        />
      )}
    </Card>
  );
}
