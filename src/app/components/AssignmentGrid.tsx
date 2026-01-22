import { Calendar, Clock, AlertTriangle, RefreshCw, FileText, Megaphone, HelpCircle, CalendarDays } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ScheduleAssignmentDialog } from "./ScheduleAssignmentDialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMcpServer } from "@/hooks/useMcpServer";
import { format, parseISO, isPast, isToday, startOfMonth } from "date-fns";
import { getToday } from "@/utils/dateUtils";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

interface CourseItem {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "not-started" | "in-progress" | "completed";
  type: "assignment" | "quiz" | "announcement" | "calendar_event";
  points?: number;
  location?: string;
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

// Convert Canvas item (assignment, quiz, announcement, calendar_event) to our format
function convertCanvasItem(canvasItem: any): CourseItem | null {
  try {
    const itemType = canvasItem.type || 'assignment';
    let dateField: Date | null = null;
    
    // Handle different date fields based on type
    if (itemType === 'announcement') {
      if (canvasItem.posted_at) {
        try {
          dateField = parseISO(canvasItem.posted_at);
        } catch {
          if (canvasItem.created_at) {
            try {
              dateField = parseISO(canvasItem.created_at);
            } catch {}
          }
        }
      }
    } else if (itemType === 'calendar_event') {
      if (canvasItem.start_at) {
        try {
          dateField = parseISO(canvasItem.start_at);
        } catch {}
      }
    } else {
      // Assignment or quiz - use due_at
      if (canvasItem.due_at) {
        try {
          dateField = parseISO(canvasItem.due_at);
        } catch {}
      }
    }
    
    // Determine status (only for assignments)
    let status: "not-started" | "in-progress" | "completed" = "not-started";
    
    if (itemType === 'assignment' && canvasItem.submission) {
      const submission = canvasItem.submission;
      if (submission.workflow_state === 'submitted' || submission.workflow_state === 'graded') {
        status = "completed";
      } else if (submission.workflow_state === 'unsubmitted' && (submission.submitted_at || submission.body)) {
        status = "in-progress";
      }
    } else if (itemType === 'announcement' || itemType === 'calendar_event') {
      status = "not-started"; // No status for these
    } else if (itemType === 'quiz') {
      status = "not-started"; // Quizzes don't have submission info in this endpoint
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
    
    return {
      id: canvasItem.id.toString(),
      title: canvasItem.name || canvasItem.title || "Untitled",
      course: canvasItem.course_name || canvasItem.course_code || "Unknown Course",
      dueDate: dateStr,
      priority,
      status,
      type: itemType,
      points: canvasItem.points_possible,
      location: canvasItem.location_name,
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
  const [loadingItems, setLoadingItems] = useState(false);
  const [hasTriedFetch, setHasTriedFetch] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "assignments" | "quizzes" | "announcements" | "events">("all");
  
  // Use refs to prevent duplicate fetches and track fetch status
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const itemsCountRef = useRef<number>(0);
  const CACHE_DURATION = 30000; // Cache for 30 seconds

  // Memoized fetch function
  const fetchItems = useCallback(async (force = false) => {
    // Prevent duplicate simultaneous fetches
    if (fetchingRef.current) {
      return;
    }

    // Check cache (unless forced refresh)
    const now = Date.now();
    if (!force && itemsCountRef.current > 0 && (now - lastFetchTimeRef.current) < CACHE_DURATION) {
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
    setLoadingItems(true);
    setHasTriedFetch(true);

    try {
      const startTime = Date.now();
      console.log('🚀 Fetching Canvas course items...');
      
      const response = await callTool('list_user_course_items', {});
      
      // Parse response (optimized)
      const canvasItems = parseCanvasResponse(response);
      console.log(`✅ Found ${canvasItems.length} Canvas items in ${Date.now() - startTime}ms`);

      // Filter to show only items with due dates from January 2026 onwards
      const january2026 = new Date(2026, 0, 1); // January 1, 2026
      january2026.setHours(0, 0, 0, 0);
      
      console.log(`📅 Filtering items: Only showing items with dates from ${format(january2026, 'MMMM yyyy')} onwards`);
      
      // Filter items by date - show only January 2026 and future
      const jan2026AndFutureItems = canvasItems.filter((canvasItem) => {
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
        } else if (canvasItem.type === 'calendar_event') {
          if (canvasItem.start_at) {
            try {
              itemDate = parseISO(canvasItem.start_at);
            } catch {}
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
          // Exclude items without dates
          return false;
        }
        
        // Include if date is January 2026 or later
        return itemDate >= january2026;
      });
      
      const assignmentsCount = jan2026AndFutureItems.filter(i => i.type === 'assignment').length;
      const quizzesCount = jan2026AndFutureItems.filter(i => i.type === 'quiz').length;
      const announcementsCount = jan2026AndFutureItems.filter(i => i.type === 'announcement').length;
      const calendarCount = jan2026AndFutureItems.filter(i => i.type === 'calendar_event').length;
      console.log(`📅 Filtered to ${assignmentsCount} assignments, ${quizzesCount} quizzes, ${announcementsCount} announcements, ${calendarCount} calendar events from January 2026 onwards`);

      // Convert to our format and filter out nulls
      const converted = jan2026AndFutureItems
        .map(convertCanvasItem)
        .filter((a): a is CourseItem => a !== null);

      // Sort by priority and due date
      converted.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.title.localeCompare(b.title);
      });

      setItems(converted);
      itemsCountRef.current = converted.length;
      lastFetchTimeRef.current = Date.now();
      
      if (converted.length === 0 && canvasItems.length === 0) {
        console.warn('⚠️ No Canvas items found.');
      }
    } catch (error: any) {
      console.error('❌ Error fetching Canvas items:', error);
      setItems([]);
      itemsCountRef.current = 0;
    } finally {
      setLoadingItems(false);
      fetchingRef.current = false;
    }
  }, [connected, loading, callTool, connect]);

  // Fetch items when connected
  useEffect(() => {
    if (connected && !hasTriedFetch) {
      fetchItems();
    }
  }, [connected, hasTriedFetch, fetchItems]);

  const priorityColors = {
    high: "border-red-500/50 bg-red-500/5",
    medium: "border-yellow-500/50 bg-yellow-500/5",
    low: "border-gray-500/50 bg-gray-500/5",
  };

  const typeColors = {
    assignment: "border-blue-500/50 bg-blue-500/5",
    quiz: "border-purple-500/50 bg-purple-500/5",
    announcement: "border-green-500/50 bg-green-500/5",
    calendar_event: "border-orange-500/50 bg-orange-500/5",
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-green-600" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-purple-600" />;
      case 'calendar_event':
        return <CalendarDays className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'Announcement';
      case 'quiz':
        return 'Quiz';
      case 'calendar_event':
        return 'Event';
      default:
        return 'Assignment';
    }
  };

  const handleScheduleClick = (item: CourseItem) => {
    if (item.type === 'assignment') {
      setSelectedItem(item);
      setDialogOpen(true);
    }
  };

  const handleRefresh = useCallback(async () => {
    await fetchItems(true); // Force refresh
  }, [fetchItems]);

  // Filter items by active tab
  const filteredItems = activeTab === "all" 
    ? items 
    : items.filter(item => {
        if (activeTab === "assignments") return item.type === "assignment";
        if (activeTab === "quizzes") return item.type === "quiz";
        if (activeTab === "announcements") return item.type === "announcement";
        if (activeTab === "events") return item.type === "calendar_event";
        return true;
      });

  const assignmentsCount = items.filter(i => i.type === 'assignment').length;
  const quizzesCount = items.filter(i => i.type === 'quiz').length;
  const announcementsCount = items.filter(i => i.type === 'announcement').length;
  const eventsCount = items.filter(i => i.type === 'calendar_event').length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Canvas Course Items</h3>
          <p className="text-xs text-muted-foreground mt-0.5">January 2026 & Future</p>
        </div>
        <div className="flex items-center gap-2">
          {loadingItems && (
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
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={loadingItems}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loadingItems ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-xs">
            All ({items.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">
            Assignments ({assignmentsCount})
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="text-xs">
            Quizzes ({quizzesCount})
          </TabsTrigger>
          <TabsTrigger value="announcements" className="text-xs">
            Announcements ({announcementsCount})
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs">
            Events ({eventsCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
        {filteredItems.length === 0 && !loadingItems && hasTriedFetch && !connectionError && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No {activeTab === "all" ? "items" : activeTab} found for January 2026 and future months.</p>
            <p className="text-xs mt-1">Make sure Canvas is connected and you have items with dates from January 2026 onwards.</p>
            <p className="text-xs mt-1">Check browser console (F12) for details.</p>
          </div>
        )}
        {filteredItems.length === 0 && !hasTriedFetch && !loadingItems && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>Connecting to Canvas...</p>
          </div>
        )}
        {filteredItems.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className={`rounded-lg border-2 p-3 ${typeColors[item.type]} ${
              item.status === "completed" ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getItemIcon(item.type)}
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">{item.course}</p>
                  <Badge variant="outline" className="text-xs">
                    {getItemTypeLabel(item.type)}
                  </Badge>
                  {item.points !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {item.points} pts
                    </Badge>
                  )}
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
              <span className="font-medium">{item.dueDate}</span>
              {item.location && (
                <>
                  <span>•</span>
                  <span>{item.location}</span>
                </>
              )}
            </div>

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
