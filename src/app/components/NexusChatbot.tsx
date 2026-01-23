import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X, Brain, Check, Clock, Calendar, Sparkles, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatAction } from "./ChatAction";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { getOpenAIApiKey } from "@/config/apiKey";
import { useMcpServer } from "@/hooks/useMcpServer";
import { useCalendar } from "@/contexts/CalendarContext";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { getToday } from "@/utils/dateUtils";

// ParsedEvent type (matching the format from googleCalendar.ts)
interface ParsedEvent {
  id: string;
  time: string;
  duration: number;
  title: string;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer";
  status: "completed" | "current" | "upcoming" | "suggested";
  location?: string;
  priority: "hard-block" | "flexible" | "optional";
}

// Google Calendar event structure from MCP server
interface CalendarEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
}

interface Message {
  id: string;
  type: "user" | "agent" | "action" | "auto-executed";
  content: string;
  timestamp: Date;
  action?: {
    type: "move" | "cancel" | "add" | "suggest";
    details: string;
    status: "pending" | "approved" | "rejected" | "auto-executed";
    userRequest?: string; // Store the original user request for parsing
    onApprove?: () => void;
    onReject?: () => void;
    eventId?: string; // For undo functionality
    priority?: "hard-block" | "flexible" | "optional"; // Hard Block vs Nice to Have
    googleCalendarLink?: string; // Deep link to Google Calendar event
  };
}

interface NexusChatbotProps {
  onScheduleChange?: (action: string, details: any) => void;
  onSendMessageFromExternal?: (message: string) => void;
  isHidden?: boolean; // For inline chat mode
}

export function NexusChatbot({ onScheduleChange, onSendMessageFromExternal, isHidden = false }: NexusChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<ParsedEvent[]>([]); // Context-awareness: calendar events for relevant period
  const [sessionState, setSessionState] = useState<{
    lastUpdate?: Date;
    lastEvents?: ParsedEvent[];
    lastAction?: string;
  }>({}); // Maintain session state to prevent amnesia
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false); // Prevent duplicate submissions
  const currentMessageIdRef = useRef<string | null>(null); // Track current response ID
  const messagesRef = useRef<Message[]>([]); // Always have access to latest messages
  
  // Use MCP server hook for Google Calendar
  const { connected, loading: mcpLoading, error: mcpError, callTool, connect } = useMcpServer('google-calendar');

  // Use CalendarContext to invalidate cache after calendar changes
  const { invalidateCache: invalidateCalendarCache } = useCalendar();

  // Helper to parse MCP CalendarEvent to ParsedEvent format
  const parseMcpEventToParsed = (event: CalendarEvent): ParsedEvent | null => {
    try {
      const startTime = event.start?.dateTime || event.start?.date;
      if (!startTime) return null;
      
      const start = new Date(startTime);
      const end = new Date(event.end?.dateTime || event.end?.date || startTime);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
      
      const now = new Date();
      let status: "completed" | "current" | "upcoming" | "suggested" = "upcoming";
      if (end < now) {
        status = "completed";
      } else if (start <= now && end >= now) {
        status = "current";
      }
      
      // Determine event type from summary/title
      const summary = event.summary || 'Untitled Event';
      const lowerSummary = summary.toLowerCase();
      let type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer" = "meeting";
      
      if (lowerSummary.includes('class') || lowerSummary.includes('course') || lowerSummary.includes('lecture')) {
        type = "class";
      } else if (lowerSummary.includes('study') || lowerSummary.includes('homework') || lowerSummary.includes('assignment')) {
        type = "study";
      } else if (lowerSummary.includes('gym') || lowerSummary.includes('workout') || lowerSummary.includes('exercise')) {
        type = "workout";
      } else if (lowerSummary.includes('coffee') || lowerSummary.includes('networking') || lowerSummary.includes('chat')) {
        type = "networking";
      } else if (lowerSummary.includes('recruiting') || lowerSummary.includes('interview') || lowerSummary.includes('info session')) {
        type = "recruiting";
      } else if (lowerSummary.includes('buffer') || lowerSummary.includes('travel')) {
        type = "buffer";
      }
      
      const timeStr = start.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      return {
        id: event.id,
        time: timeStr,
        duration,
        title: summary,
        type,
        status,
        location: event.location,
        priority: "hard-block" as const,
      };
    } catch (error) {
      console.error('Error parsing MCP event:', error);
      return null;
    }
  };

  // Helper to parse MCP response and convert to ParsedEvent array
  const parseMcpEventsResponse = (response: any): ParsedEvent[] => {
    try {
      let events: CalendarEvent[] = [];
      
      if (!response) {
        return [];
      }
      
      if (Array.isArray(response)) {
        // Response is an array of content items
        const textContent = response.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          try {
            events = JSON.parse(textContent.text);
          } catch (parseError) {
            console.error('Error parsing JSON from text content:', parseError);
            return [];
          }
        } else if (response.length > 0 && typeof response[0] === 'object' && 'id' in response[0]) {
          // Response might be an array of events directly
          events = response as CalendarEvent[];
        } else {
          console.warn('Unexpected response format:', response);
          return [];
        }
      } else if (typeof response === 'string') {
        // Response is a JSON string
        try {
          events = JSON.parse(response);
        } catch (parseError) {
          console.error('Error parsing JSON string:', parseError);
          return [];
        }
      } else {
        console.warn('Unexpected response type:', typeof response, response);
        return [];
      }
      
      // Ensure events is an array
      if (!Array.isArray(events)) {
        console.warn('Parsed events is not an array:', events);
        return [];
      }
      
      return events
        .map(parseMcpEventToParsed)
        .filter((event): event is ParsedEvent => event !== null);
    } catch (error) {
      console.error('Error in parseMcpEventsResponse:', error);
      return [];
    }
  };

  // Parse date references from user input (tomorrow, next week, Monday, etc.)
  const parseDateFromInput = (userInput: string): { startDate: Date; endDate: Date } => {
    const lower = userInput.toLowerCase();
    const today = getToday(); // Use actual system date
    let targetDate = new Date(today);
    
    // Check for specific date references
    if (lower.includes('tomorrow')) {
      targetDate = addDays(today, 1);
    } else if (lower.includes('next week')) {
      targetDate = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
    } else if (lower.includes('this week')) {
      targetDate = startOfWeek(today, { weekStartsOn: 1 });
    } else if (lower.includes('next month')) {
      targetDate = addMonths(today, 1);
    } else {
      // Check for day names (Monday, Tuesday, etc.)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < dayNames.length; i++) {
        if (lower.includes(dayNames[i])) {
          const targetDay = i;
          const currentDay = today.getDay();
          let daysUntilTarget = (targetDay - currentDay + 7) % 7;
          if (daysUntilTarget === 0) daysUntilTarget = 7; // If today, get next week's occurrence
          targetDate = addDays(today, daysUntilTarget);
          break;
        }
      }
    }
    
    // Default to current week for broader context
    if (targetDate.getTime() === today.getTime()) {
      return {
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate: endOfWeek(today, { weekStartsOn: 1 }),
      };
    }
    
    // Return date range for the target date
    return {
      startDate: startOfDay(targetDate),
      endDate: endOfDay(targetDate),
    };
  };

  // Load calendar events for context-awareness (loads current week by default)
  const loadCalendarEvents = useCallback(async (dateRange?: { startDate: Date; endDate: Date }): Promise<ParsedEvent[]> => {
    if (!connected) {
      await connect();
      return []; // Return empty array if not connected
    }
    
    try {
      // Default to current week if no date range specified (using global "today")
      const today = getToday(); // Use actual system date
      const startDate = dateRange?.startDate || startOfWeek(today, { weekStartsOn: 1 });
      const endDate = dateRange?.endDate || endOfWeek(today, { weekStartsOn: 1 });
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const response = await callTool('list_events', {
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: 500, // Increased for week/month views
      });
      
      const parsedEvents = parseMcpEventsResponse(response);
      setCalendarEvents(parsedEvents);
      return parsedEvents || []; // Return events, ensure it's an array
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setCalendarEvents([]); // Set empty array on error
      return []; // Return empty array if load fails
    }
  }, [connected, callTool, connect]);

  // Generate simple welcome message with priority ranking
  const generatePersonalizedGreeting = useCallback(() => {
    setMessages((prevMessages) => {
      if (prevMessages.length === 0 || (prevMessages.length === 1 && prevMessages[0].type === "agent")) {
        return [{
          id: "1",
          type: "agent",
          content: "Hi! I am Kaisey, tell me your priority and I'll optimize your schedule",
          timestamp: new Date(),
        }];
      }
      return prevMessages;
    });
  }, []);

  // Load current week's events when component mounts and MCP is connected
  useEffect(() => {
    if (connected && !mcpLoading) {
      loadCalendarEvents().then((events) => {
        // Update session state with loaded events
        setSessionState(prev => ({
          ...prev,
          lastEvents: events,
        }));
        
        // Greeting is generated separately on mount
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, mcpLoading, loadCalendarEvents]);

  // Connect to MCP on mount
  useEffect(() => {
    if (!connected && !mcpLoading) {
      connect();
    }
  }, []);

  // Keep messagesRef in sync with messages state for reliable access in callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Generate initial suggestions based on calendar events
  const generateInitialSuggestions = useCallback((events: ParsedEvent[]): string[] => {
    const suggestions: string[] = [];
    
    if (events.length === 0) {
      return ["I've loaded your calendar, but I don't see any events scheduled. Would you like me to help you plan your day?"];
    }

    // Check for tight schedules (events back-to-back)
    const sortedEvents = [...events].sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];
      
      const currentTime = current.time.split(':').map(Number);
      const nextTime = next.time.split(':').map(Number);
      const currentEnd = currentTime[0] * 60 + currentTime[1] + current.duration;
      const nextStart = nextTime[0] * 60 + nextTime[1];
      
      if (currentEnd >= nextStart) {
        const currentEndHour = Math.floor(currentEnd / 60);
        const currentEndMin = currentEnd % 60;
        const timeStr = `${currentEndHour.toString().padStart(2, '0')}:${currentEndMin.toString().padStart(2, '0')}`;
        suggestions.push(
          `I noticed a tight schedule: "${current.title}" ends at ${timeStr} and "${next.title}" starts immediately after. I recommend adding a 15-minute buffer between these events. Would you like me to reschedule "${next.title}" to start 15 minutes later?`
        );
        break; // Only suggest one at a time
      }
    }

    // If no conflicts, suggest optimization
    if (suggestions.length === 0 && events.length > 0) {
      const todayEvents = events.filter(e => e.status === "upcoming" || e.status === "current");
      if (todayEvents.length > 0) {
        suggestions.push(
          `I've analyzed your calendar for today. You have ${todayEvents.length} upcoming event${todayEvents.length > 1 ? 's' : ''}. Your schedule looks balanced! Is there anything specific you'd like me to optimize or adjust?`
        );
      }
    }

    return suggestions;
  }, []);

  const scrollToBottom = () => {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const callOpenAI = async (
    userMessage: string, 
    conversationHistory: Array<{role: string, content: string}>,
    calendarContext?: ParsedEvent[]
  ): Promise<string> => {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.");
    }

    let calendarContextText = '';
    if (calendarContext && calendarContext.length > 0) {
      calendarContextText = `\n\nCurrent calendar events for the requested period:\n${calendarContext.map(e => 
        `- ${e.title} (${e.time}, ${e.duration}min, ${e.type})`
      ).join('\n')}\n\nUse this calendar information to make informed suggestions. Consider conflicts, priorities, and tradeoffs.`;
    }

    const systemPrompt = `You are Kaisey, an AI assistant helping MBA students optimize their schedules.

**Core Principles:**
- Be concise: Start with 1-2 sentence summary, then provide details only if needed
- Be actionable: Suggest specific changes with clear reasoning
- Be conversational: Use friendly, natural language (e.g., "Hey!" instead of "Good morning")
- Remember context: ALWAYS maintain awareness of the current calendar state. If you just updated the calendar, reference the new state directly without asking the user to re-list events.

**Response Format:**
1. **Summary** (1-2 sentences): High-level recommendation
2. **Details** (if needed): Specific changes in a bulleted list
3. **Reasoning** (if needed): Brief explanation of tradeoffs

${calendarContextText}

**When suggesting actions:** 
- For simple additions (dinner, casual meetings, personal events): Just do it and confirm. Don't ask for approval or provide lengthy reasoning.
- For complex moves that impact hard blocks (classes, interviews, exams): Explain the impact and ask for approval.
- NEVER ask the user to "provide your schedule" or "list your events" if you have access to calendar data or just updated it. Use the calendar context provided.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  };

  // Expose handleSendMessage for external use (inline chat mode)
  const handleSendMessage = async (externalMessage?: string) => {
    const messageToSend = externalMessage || inputValue.trim();
    if (!messageToSend) return;

    // Prevent duplicate submissions
    if (isProcessingRef.current || isTyping) {
      console.warn("Already processing a message, ignoring duplicate request");
      return;
    }

    isProcessingRef.current = true;
    
    if (!externalMessage) {
      setInputValue("");
    }
    setIsTyping(true);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: messageToSend,
      timestamp: new Date(),
    };

    // Add user message to state
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Build conversation history from messagesRef (always has latest state)
      // This ensures we have full conversation context for the AI
      const allPreviousMessages = messagesRef.current; // Get all messages before this new one
      console.log('[Chatbot] Building conversation history from', allPreviousMessages.length, 'messages');

      const conversationHistory = allPreviousMessages
        .filter(msg => {
          // Include user and agent messages
          if (msg.type === "user" || msg.type === "agent" || msg.type === "auto-executed") return true;
          // Include action messages that have been resolved (approved/rejected/auto-executed)
          if (msg.type === "action" && msg.action?.status !== "pending") return true;
          return false;
        })
        .map(msg => {
          // Convert action messages to assistant messages for the API
          if (msg.type === "action" && msg.action?.status !== "pending") {
            const statusText = msg.action.status === "approved" ? " (approved)" : 
                             msg.action.status === "auto-executed" ? " (executed)" : " (declined)";
            return {
              role: "assistant" as const,
              content: msg.content + statusText,
            };
          }
          // Include auto-executed messages as assistant messages
          if (msg.type === "auto-executed") {
            return {
              role: "assistant" as const,
              content: msg.content,
            };
          }
          return {
            role: (msg.type === "user" ? "user" : "assistant") as const,
            content: msg.content,
          };
        });

      // Add session state context to prevent amnesia
      let sessionContext = "";
      if (sessionState.lastUpdate && sessionState.lastEvents) {
        const timeSinceUpdate = (Date.now() - sessionState.lastUpdate.getTime()) / 1000 / 60; // minutes
        if (timeSinceUpdate < 5) { // If updated in last 5 minutes
          sessionContext = `\n\nIMPORTANT: I just ${sessionState.lastAction || 'updated'} your calendar ${Math.round(timeSinceUpdate)} minute(s) ago. The current calendar state includes: ${sessionState.lastEvents.map(e => `${e.title} at ${e.time}`).join(', ')}. Do NOT ask the user to re-list their schedule - use this information directly.`;
        }
      }

      // Parse date range from user input and load relevant events
      const dateRange = parseDateFromInput(messageToSend);
      
      // Load events for the detected date range and use the returned events directly
      const relevantEvents = await loadCalendarEvents(dateRange);
      
      // Ensure relevantEvents is an array (defensive programming)
      const eventsArray = Array.isArray(relevantEvents) ? relevantEvents : [];

      // Call OpenAI API with calendar context and session state
      const userMessageWithContext = messageToSend + sessionContext;
      const aiResponse = await callOpenAI(userMessageWithContext, conversationHistory, eventsArray.length > 0 ? eventsArray : undefined);

      // Parse response to determine if it's an action or regular message
      // Only mark as action if it's clearly proposing a concrete, actionable change
      // Look for patterns like "I can move...", "I'll cancel...", "Let me add...", "I recommend moving..."
      const lowerResponse = aiResponse.toLowerCase();
      let actionType: "move" | "cancel" | "add" | "suggest" | undefined;
      let actionDetails = "";

      // Enhanced intent parsing for scheduling keywords
      const lowerInput = messageToSend.toLowerCase();

      // Check for specific scheduling intents - expanded to include more common phrases
      const hasScheduleIntent = /schedule|block time|study for|add .* (at|to|for)|create .* (at|to|for)|put .* (at|on|in)|book|set up/i.test(messageToSend);
      const hasInsteadOfIntent = /instead of|replace/i.test(messageToSend);

      console.log('[Chatbot] Intent detection:', { hasScheduleIntent, hasInsteadOfIntent, lowerInput });
      
      // More conservative detection - only mark as action if it's proposing a specific action
      const actionPatterns = {
        move: /(?:i can|i'll|let me|i recommend|i suggest).*(?:move|reschedule|shift)/,
        cancel: /(?:i can|i'll|let me|i recommend|i suggest).*(?:cancel|remove|delete)/,
        add: /(?:i can|i'll|let me|i recommend|i suggest|schedule|block time).*(?:add|schedule|block|create|study for)/,
        suggest: /(?:i recommend|i suggest|you should).*(?:move|cancel|add|reschedule|optimize)/,
      };
      
      // Determine if this is a simple addition (low-stakes) or complex operation (requires approval)
      const isSimpleAddition = hasScheduleIntent && !hasInsteadOfIntent && 
        !/(?:move|reschedule|shift|cancel|delete|replace|instead)/i.test(messageToSend);
      
      // Check if action impacts hard blocks (requires approval)
      const impactsHardBlocks = /(?:class|meeting|interview|exam|deadline)/i.test(messageToSend) ||
        actionPatterns.move.test(lowerResponse) || actionPatterns.cancel.test(lowerResponse);

      // If user explicitly uses scheduling keywords, mark as "add" action
      if (hasScheduleIntent && !hasInsteadOfIntent) {
        actionType = "add";
        actionDetails = "Schedule event";
      }

      if (actionPatterns.move.test(lowerResponse)) {
        actionType = "move";
        actionDetails = "Schedule adjustment";
      } else if (actionPatterns.cancel.test(lowerResponse)) {
        actionType = "cancel";
        actionDetails = "Cancel event";
      } else if (actionPatterns.add.test(lowerResponse)) {
        actionType = "add";
        actionDetails = "Add to schedule";
      } else if (actionPatterns.suggest.test(lowerResponse)) {
        actionType = "suggest";
        actionDetails = "Optimization suggestion";
      }

      // For simple additions, auto-execute without approval
      const shouldAutoExecute = isSimpleAddition && actionType === "add" && !impactsHardBlocks;

      console.log('[Chatbot] Action detection result:', {
        actionType,
        actionDetails,
        isSimpleAddition,
        impactsHardBlocks,
        shouldAutoExecute,
        aiResponsePreview: aiResponse.substring(0, 100)
      });

      // Generate unique message ID and track it
      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      currentMessageIdRef.current = messageId;

      // For simple additions, use AI to extract event details intelligently
      if (shouldAutoExecute && connected) {
        console.log('[Chatbot] Auto-execute: using AI to extract event details...');

        // Use AI to extract smart event details with calendar context
        const eventDetails = await extractEventDetailsWithAI(messageToSend, eventsArray)
          || parseEventDetails(messageToSend); // Fallback to basic parsing

        console.log('[Chatbot] Auto-execute: extracted event details:', eventDetails);

        if (eventDetails) {
          // Add temporary message
          const tempMessage: Message = {
            id: messageId,
            type: "agent",
            content: `Adding "${eventDetails.title}" to your calendar at ${format(eventDetails.start, 'h:mm a')}...`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, tempMessage]);

          // Determine priority from user input
          const isHardBlock = /(?:class|meeting|interview|exam|deadline|must|required|critical)/i.test(messageToSend);
          const priority = isHardBlock ? "hard-block" : "flexible";

          console.log('[Chatbot] Auto-execute: calling create_event for:', eventDetails.title, 'at', format(eventDetails.start, 'h:mm a'));

          // Create the event
          callTool('create_event', {
              calendarId: 'primary',
              summary: eventDetails.title,
              description: `Added via Kaisey: ${messageToSend}\nPriority: ${priority}`,
              start: { dateTime: eventDetails.start.toISOString() },
              end: { dateTime: eventDetails.end.toISOString() },
            }).then(async (response: any) => {
              console.log('[Chatbot] Auto-execute: create_event response:', response);

              // Invalidate CalendarContext cache - this won't trigger a fetch, just clears cache
              // Components will refetch when they need to
              invalidateCalendarCache();

              // Get event ID from response for undo functionality
              let createdEventId: string | undefined;
              if (typeof response === 'string') {
                try {
                  const parsed = JSON.parse(response);
                  createdEventId = parsed?.id;
                } catch (e) {
                  // Response might be event ID directly
                  createdEventId = response;
                }
              } else if (response?.id) {
                createdEventId = response.id;
              }
              
              // Generate Google Calendar deep link
              const googleCalendarLink = createdEventId 
                ? `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(createdEventId)}`
                : undefined;

              // Reload calendar to update state
              const updatedEvents = await loadCalendarEvents();
              setSessionState(prev => ({
                ...prev,
                lastUpdate: new Date(),
                lastEvents: updatedEvents,
                lastAction: "add",
              }));

              // Import toast for undo functionality
              const { toast: toastFn } = await import("sonner");
              
              // Show toast with undo option
              toastFn.success("Event added to calendar", {
                description: `${eventDetails.title} scheduled for ${format(eventDetails.start, 'h:mm a')}`,
                action: {
                  label: "Undo",
                  onClick: async () => {
                    if (createdEventId) {
                      try {
                        await callTool('delete_event', {
                          calendarId: 'primary',
                          eventId: createdEventId,
                        });
                        await loadCalendarEvents();
                        toastFn.success("Event removed");
                      } catch (e) {
                        console.error("Error undoing event:", e);
                      }
                    }
                  },
                },
              });

              // Update message to show auto-executed status
              setMessages((prev) => prev.map((msg) => 
                msg.id === messageId 
                  ? {
                      ...msg,
                      type: "auto-executed" as const,
                      content: `✓ Added "${eventDetails.title}" at ${format(eventDetails.start, 'h:mm a')}. ${googleCalendarLink ? `[View in Google Calendar](${googleCalendarLink})` : ''}`,
                      action: {
                        type: "add",
                        details: "Event added",
                        status: "auto-executed",
                        userRequest: messageToSend,
                        eventId: createdEventId,
                        googleCalendarLink,
                        priority: priority as "hard-block" | "flexible" | "optional",
                      },
                    }
                  : msg
              ));
            }).catch((error) => {
              console.error("Error auto-executing event:", error);
              const { toast: toastFn } = require("sonner");
              toastFn.error("Failed to add event", {
                description: error.message || "Please try again",
              });

              // Update message to show error
              setMessages((prev) => prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content: `Sorry, I couldn't add that event. ${error.message || "Please try again."}`,
                    }
                  : msg
              ));
            });

          // Return early - we've handled this as auto-execute
          return;
        }
      }

      // For non-auto-execute cases, add the AI response as a message
      setMessages((prev) => {
        const existingMessage = prev.find((m) => m.id === messageId);
        if (existingMessage) {
          console.warn("Duplicate message ID detected, skipping");
          return prev;
        }

        const agentMessage: Message = actionType
          ? {
              id: messageId,
              type: "action",
              content: aiResponse,
              timestamp: new Date(),
              action: {
                type: actionType,
                details: actionDetails,
                status: "pending",
                userRequest: messageToSend, // Store user's original request for parsing
              },
            }
          : {
              id: messageId,
              type: "agent",
              content: aiResponse,
              timestamp: new Date(),
            };

        return [...prev, agentMessage];
      });
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      const errorMessageId = `${Date.now()}-error-${Math.random().toString(36).substr(2, 9)}`;
      const errorMessage: Message = {
        id: errorMessageId,
        type: "agent",
        content: error instanceof Error 
          ? `I apologize, but I encountered an error: ${error.message}. Please check your API key configuration.`
          : "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => {
        // Prevent duplicate error messages
        if (prev.some((m) => m.id === errorMessageId)) {
          return prev;
        }
        return [...prev, errorMessage];
      });
    } finally {
      setIsTyping(false);
      isProcessingRef.current = false;
      currentMessageIdRef.current = null;
    }
  };

  // AI-powered event extraction - uses LLM to intelligently extract event details
  const extractEventDetailsWithAI = async (
    userRequest: string,
    calendarEvents: ParsedEvent[]
  ): Promise<{ title: string; start: Date; end: Date } | null> => {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) return null;

    const today = getToday();
    const todayStr = format(today, 'yyyy-MM-dd');
    const currentHour = new Date().getHours();

    // Build a list of busy times from calendar events
    const busyTimes = calendarEvents
      .filter(e => e.startDate && !isNaN(e.startDate.getTime()))
      .map(e => ({
        title: e.title,
        time: e.time,
        duration: e.duration,
        date: format(e.startDate, 'yyyy-MM-dd')
      }));

    // Find free slots for today (simple approach: gaps between events)
    const todayEvents = calendarEvents
      .filter(e => {
        if (!e.startDate || isNaN(e.startDate.getTime())) return false;
        return format(e.startDate, 'yyyy-MM-dd') === todayStr;
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    let freeSlots: string[] = [];
    if (todayEvents.length === 0) {
      freeSlots = ['Most of the day is free'];
    } else {
      // Check gaps between events
      let lastEnd = Math.max(currentHour, 8); // Start from current hour or 8am
      for (const event of todayEvents) {
        const eventStart = parseInt(event.time.split(':')[0]);
        if (eventStart > lastEnd + 1) {
          freeSlots.push(`${lastEnd}:00 - ${eventStart}:00`);
        }
        const eventEnd = eventStart + Math.ceil(event.duration / 60);
        lastEnd = Math.max(lastEnd, eventEnd);
      }
      if (lastEnd < 21) { // Before 9pm
        freeSlots.push(`${lastEnd}:00 - 21:00`);
      }
    }

    const prompt = `Extract event details from the user's request. Return ONLY valid JSON.

User request: "${userRequest}"

Today's date: ${todayStr}
Current time: ${currentHour}:00

Existing calendar events today:
${busyTimes.length > 0 ? busyTimes.map(e => `- ${e.title} at ${e.time} (${e.duration}min)`).join('\n') : 'No events scheduled'}

Free time slots today: ${freeSlots.join(', ')}

Instructions:
1. Extract a clear, concise event TITLE (not the raw request, but a proper event name like "Dinner", "Gym Session", "Study Time", etc.)
2. Determine the DATE (default to today unless specified otherwise like "tomorrow", "Monday", etc.)
3. Determine the TIME:
   - If user specifies a time, use it
   - If no time specified, pick a free slot that makes sense for the activity
   - Avoid scheduling over existing events
4. Determine DURATION (default 60 minutes unless specified)

Return ONLY this JSON format, no other text:
{"title": "Event Name", "date": "YYYY-MM-DD", "time": "HH:MM", "durationMinutes": 60}`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 150,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and convert to Date objects
      if (!parsed.date || !parsed.time) {
        console.error('[Chatbot] Missing date or time in parsed response:', parsed);
        return null;
      }

      // Validate time format (HH:MM)
      const timeParts = parsed.time.split(':');
      if (timeParts.length !== 2) {
        console.error('[Chatbot] Invalid time format:', parsed.time);
        return null;
      }

      const [hours, minutes] = timeParts.map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('[Chatbot] Invalid time values:', hours, minutes);
        return null;
      }

      // Validate date format (YYYY-MM-DD)
      const dateParts = parsed.date.split('-');
      if (dateParts.length !== 3) {
        console.error('[Chatbot] Invalid date format:', parsed.date);
        return null;
      }

      const [year, month, day] = dateParts.map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.error('[Chatbot] Invalid date values:', year, month, day);
        return null;
      }

      // Create date object with validation
      const eventDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      // Validate the date is valid
      if (isNaN(eventDate.getTime())) {
        console.error('[Chatbot] Invalid date created:', { year, month, day, hours, minutes });
        return null;
      }

      const durationMinutes = parsed.durationMinutes || 60;
      const endDate = new Date(eventDate);
      endDate.setMinutes(endDate.getMinutes() + durationMinutes);

      // Final validation
      if (isNaN(endDate.getTime())) {
        console.error('[Chatbot] Invalid end date');
        return null;
      }

      console.log('[Chatbot] AI extracted event details:', parsed);

      return {
        title: parsed.title || 'Event',
        start: eventDate,
        end: endDate
      };
    } catch (error) {
      console.error('[Chatbot] AI event extraction failed:', error);
      return null;
    }
  };

  // Fallback: basic regex parsing (used when AI extraction fails)
  const parseEventDetails = (userRequest: string): { title: string; start: Date; end: Date } | null => {
    const lower = userRequest.toLowerCase();
    
    // Extract time (e.g., "5 PM", "5:00 PM", "17:00")
    const timeMatch = userRequest.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    let hour = 12;
    let minute = 0;
    
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toUpperCase();
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      if (!ampm && hour < 12) hour += 12; // Assume PM if no AM/PM specified and hour < 12
    }
    
    // Extract duration (e.g., "for 15 mins", "15 minutes", "for 30 min")
    let durationMinutes = 60; // Default 1 hour
    const durationMatch = lower.match(/(?:for|duration:?)\s*(\d+)\s*(?:min(?:ute)?s?|mins?)/i);
    if (durationMatch) {
      durationMinutes = parseInt(durationMatch[1]);
    }
    
    // Determine date from user input (use same logic as parseDateFromInput)
    const today = getToday(); // Use actual system date
    let eventDate = new Date(today);
    
    // Check for specific date references
    if (lower.includes('tomorrow')) {
      eventDate = addDays(today, 1);
    } else if (lower.includes('next week')) {
      eventDate = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
    } else if (lower.includes('this week')) {
      eventDate = startOfWeek(today, { weekStartsOn: 1 });
    } else if (lower.includes('next month')) {
      eventDate = addMonths(today, 1);
    } else {
      // Check for day names (Monday, Tuesday, etc.)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < dayNames.length; i++) {
        if (lower.includes(dayNames[i])) {
          const targetDay = i;
          const currentDay = today.getDay();
          let daysUntilTarget = (targetDay - currentDay + 7) % 7;
          if (daysUntilTarget === 0) daysUntilTarget = 7; // If today, get next week's occurrence
          eventDate = addDays(today, daysUntilTarget);
          break;
        }
      }
    }
    
    eventDate.setHours(hour, minute, 0, 0);
    
    // Extract title - remove time, duration, and common words
    let title = 'Event';
    const stopWords = ['add', 'an', 'event', 'for', 'at', 'pm', 'am', 'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'week', 'month', 'mins', 'minutes', 'min', 'duration'];
    const timePattern = /(\d{1,2}):?(\d{2})?\s*(AM|PM)?/gi;
    const durationPattern = /(?:for|duration:?)\s*\d+\s*(?:min(?:ute)?s?|mins?)/gi;
    
    // Remove time and duration from the request
    let cleanedRequest = userRequest
      .replace(timePattern, '')
      .replace(durationPattern, '')
      .trim();
    
    // Split into words and filter out stop words
    const words = cleanedRequest
      .split(/\s+/)
      .filter(w => w.length > 0 && !stopWords.includes(w.toLowerCase()))
      .filter(w => !w.match(/^\d+$/)); // Remove standalone numbers
    
    if (words.length > 0) {
      // Take meaningful words (skip very short words unless they're important)
      title = words
        .filter(w => w.length > 2 || ['at', 'in', 'on'].includes(w.toLowerCase()))
        .join(' ')
        .trim();
      
      // If title is still empty or too short, use first few words
      if (!title || title.length < 2) {
        title = words.slice(0, 3).join(' ').trim();
      }
    }
    
    // Capitalize first letter
    if (title && title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
    }
    
    // Calculate end time based on duration
    const endTime = new Date(eventDate);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
    
    return { title: title || 'Event', start: eventDate, end: endTime };
  };

  const handleApproveAction = async (messageId: string) => {
    console.log('[Chatbot] handleApproveAction called with messageId:', messageId);

    // Get the message from the ref which always has the latest state
    const message = messagesRef.current.find((m) => m.id === messageId);
    console.log('[Chatbot] Found message:', message ? { id: message.id, action: message.action } : 'NOT FOUND');

    // Update message status to approved
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.action
          ? { ...msg, action: { ...msg.action, status: "approved" as const } }
          : msg
      )
    );

    if (message?.action) {
      console.log('[Chatbot] Executing action type:', message.action.type, 'userRequest:', message.action.userRequest);
      try {
        // Ensure connected to MCP
        if (!connected) {
          await connect();
        }
        
        let createdEventId: string | undefined;
        let googleCalendarLink: string | undefined;
        
        // Execute calendar operation based on action type
        if (message.action.type === "add" && message.action.userRequest) {
          // Parse event details from user request
          const eventDetails = parseEventDetails(message.action.userRequest);
          
          if (eventDetails) {
            console.log('[Chatbot] Parsed event details:', eventDetails);

            // Determine priority (default to flexible unless specified or detected from user input)
            const userRequest = message.action?.userRequest || "";
            const isHardBlock = /(?:class|meeting|interview|exam|deadline|must|required|critical)/i.test(userRequest);
            const priority = message.action?.priority || (isHardBlock ? "hard-block" : "flexible");

            console.log('[Chatbot] Creating calendar event...');
            // Use MCP create_event tool
            const response = await callTool('create_event', {
              calendarId: 'primary',
              summary: eventDetails.title,
              description: `Created via Kaisey\nPriority: ${priority}`,
              start: {
                dateTime: eventDetails.start.toISOString(),
              },
              end: {
                dateTime: eventDetails.end.toISOString(),
              },
            });
            console.log('[Chatbot] create_event response:', response);

            // Invalidate CalendarContext cache - components will refetch when needed
            invalidateCalendarCache();

            // Extract event ID and create Google Calendar link
            createdEventId = response?.id || (typeof response === 'string' ? JSON.parse(response)?.id : undefined);
            if (createdEventId) {
              googleCalendarLink = `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(createdEventId)}`;
            }
            
            // Reload calendar events to refresh context and update session state
            const updatedEvents = await loadCalendarEvents();
            setSessionState(prev => ({
              ...prev,
              lastUpdate: new Date(),
              lastEvents: updatedEvents,
              lastAction: "add",
            }));
            
            // Refresh greeting with updated events
            if (updatedEvents.length > 0) {
              generatePersonalizedGreeting(updatedEvents);
            }
            
            // Notify parent component
            if (onScheduleChange) {
              onScheduleChange(message.action.type, `Created event: ${eventDetails.title} at ${eventDetails.start.toLocaleTimeString()}`);
            }
            
            // Add success message with sync status
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  type: "agent",
                  content: `✓ Synced to Google Calendar. Created "${eventDetails.title}" at ${eventDetails.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.${googleCalendarLink ? ` [View event](${googleCalendarLink})` : ''}`,
                  timestamp: new Date(),
                },
              ]);
            }, 500);
          } else {
            throw new Error('Could not parse event details from your request');
          }
        } else if (message.action.type === "move" && message.action.userRequest) {
          // Handle move/reschedule
          const eventDetails = parseEventDetails(message.action.userRequest);
          if (eventDetails && message.action.eventId) {
            await callTool('update_event', {
              calendarId: 'primary',
              eventId: message.action.eventId,
              start: { dateTime: eventDetails.start.toISOString() },
              end: { dateTime: eventDetails.end.toISOString() },
            });

            // Invalidate CalendarContext cache - components will refetch when needed
            invalidateCalendarCache();

            const updatedEvents = await loadCalendarEvents();
            setSessionState(prev => ({
              ...prev,
              lastUpdate: new Date(),
              lastEvents: updatedEvents,
              lastAction: "move",
            }));
            
            // Refresh greeting with updated events
            if (updatedEvents.length > 0) {
              generatePersonalizedGreeting(updatedEvents);
            }
            
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  type: "agent",
                  content: "✓ Event rescheduled and synced to Google Calendar.",
                  timestamp: new Date(),
                },
              ]);
            }, 500);
          }
        } else {
          // For other action types, just notify
          if (onScheduleChange) {
            onScheduleChange(message.action.type, message.action.details);
          }
          
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                type: "agent",
                content: "✓ Calendar updated successfully. Your schedule has been optimized.",
                timestamp: new Date(),
              },
            ]);
          }, 500);
        }
      } catch (error: any) {
        console.error('Error executing calendar action:', error);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: "agent",
              content: `Sorry, I encountered an error: ${error.message}. Please try again or add the event manually.`,
              timestamp: new Date(),
            },
          ]);
        }, 500);
      }
    }
  };

  const handleRejectAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.action
          ? { ...msg, action: { ...msg.action, status: "rejected" as const } }
          : msg
      )
    );

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "agent",
          content: "Understood. Is there another way I can optimize your schedule?",
          timestamp: new Date(),
        },
      ]);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Expose handleSendMessage, messages, and refresh function globally for inline chat access
  React.useEffect(() => {
    (window as any).__nexusChatbotSendMessage = handleSendMessage;
    (window as any).__nexusChatbotMessages = messages;
    (window as any).__nexusChatbotIsTyping = isTyping;
    (window as any).__nexusChatbotRefresh = async () => {
      // Reload calendar in background (day, week, month)
      const today = getToday();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      
      const events = await Promise.all([
        loadCalendarEvents({ startDate: dayStart, endDate: dayEnd }),
        loadCalendarEvents({ startDate: weekStart, endDate: weekEnd }),
        loadCalendarEvents({ startDate: monthStart, endDate: monthEnd }),
      ]);
      
      // Update session state
      setSessionState(prev => ({
        ...prev,
        lastUpdate: new Date(),
        lastEvents: events[0], // Today's events
      }));
      
      // Generate new personalized greeting
      if (events[0] && events[0].length > 0) {
        generatePersonalizedGreeting(events[0]);
      } else {
        setMessages([{
          id: "1",
          type: "agent",
          content: "Hey! You've got a free day today. What would you like to plan?",
          timestamp: new Date(),
        }]);
      }
    };
    (window as any).__nexusChatbotLoadCalendar = loadCalendarEvents;
    (window as any).__nexusChatbotHandleApprove = handleApproveAction;
    (window as any).__nexusChatbotHandleReject = handleRejectAction;
    (window as any).__nexusChatbotGenerateSuggestions = generateInitialSuggestions;
    (window as any).__nexusChatbotGenerateProactiveRecommendations = async () => {
      // Generate proactive recommendations when chat opens
      try {
        const today = getToday();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);
        dayStart.setHours(0, 0, 0, 0);
        dayEnd.setHours(23, 59, 59, 999);

        const events = await loadCalendarEvents({ startDate: dayStart, endDate: dayEnd });
        
        if (events.length > 0) {
          const suggestions = generateInitialSuggestions(events);
          if (suggestions.length > 0) {
            // Send first recommendation as an actionable message
            const recommendationText = `I've analyzed your schedule for today. ${suggestions[0]}\n\nWould you like me to implement this change?`;
            
            // Create an action message with approve/reject buttons
            const actionMessage: Message = {
              id: Date.now().toString(),
              type: "action",
              content: recommendationText,
              timestamp: new Date(),
              action: {
                type: "suggest",
                details: "Schedule optimization",
                status: "pending",
                userRequest: "Analyze today's schedule and suggest improvements",
              },
            };
            
            setMessages((prev) => [...prev, actionMessage]);
          }
        }
      } catch (error) {
        console.error("Error generating proactive recommendations:", error);
      }
    };
    return () => {
      delete (window as any).__nexusChatbotSendMessage;
      delete (window as any).__nexusChatbotMessages;
      delete (window as any).__nexusChatbotIsTyping;
      delete (window as any).__nexusChatbotRefresh;
      delete (window as any).__nexusChatbotLoadCalendar;
      delete (window as any).__nexusChatbotHandleApprove;
      delete (window as any).__nexusChatbotHandleReject;
      delete (window as any).__nexusChatbotGenerateSuggestions;
      delete (window as any).__nexusChatbotGenerateProactiveRecommendations;
    };
  }, [messages, isTyping, loadCalendarEvents, generateInitialSuggestions, generatePersonalizedGreeting, sessionState]);

  // If hidden mode, just expose the send function and return null
  if (isHidden) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-24 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 relative group"
          >
            <MessageSquare className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse"></span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-foreground text-background text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Chat with Kaisey
            </div>
          </Button>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="h-full flex flex-col border-2">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-500">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Kaisey</h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Active
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.type === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-lg bg-blue-500 text-white p-3">
                          <p className="text-sm">{message.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ) : message.type === "agent" || message.type === "auto-executed" ? (
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-[80%]">
                          <div className={`rounded-lg p-3 ${
                            message.type === "auto-executed" 
                              ? "bg-green-50 border border-green-200" 
                              : "bg-muted"
                          }`}>
                            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="text-sm">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-1.5">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                                  a: ({ href, children }) => (
                                    <a 
                                      href={href} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                                    >
                                      {children}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            {message.type === "auto-executed" && message.action?.googleCalendarLink && (
                              <div className="mt-2 flex items-center gap-2">
                                <Badge className="bg-green-500 text-white text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  Synced to Google
                                </Badge>
                                <a
                                  href={message.action.googleCalendarLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  View in Google Calendar
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground mt-2 block">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Action message
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-[80%] flex-1">
                          <div className="rounded-lg border-2 border-blue-500 bg-blue-500/5 p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <Badge className="bg-blue-500 text-white">
                                {message.action?.type === "move" && <Clock className="w-3 h-3 mr-1" />}
                                {message.action?.type === "cancel" && <X className="w-3 h-3 mr-1" />}
                                {message.action?.type === "add" && <Calendar className="w-3 h-3 mr-1" />}
                                {message.action?.type === "suggest" && <Sparkles className="w-3 h-3 mr-1" />}
                                {message.action?.type}
                              </Badge>
                            </div>
                            <div className="text-sm prose prose-sm max-w-none dark:prose-invert mb-2">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="text-sm">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            
                            <ChatAction
                              onApprove={() => handleApproveAction(message.id)}
                              onReject={() => handleRejectAction(message.id)}
                              disabled={message.action?.status !== "pending"}
                              approved={message.action?.status === "approved"}
                              rejected={message.action?.status === "rejected"}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                        <span className="text-xs text-muted-foreground">Analyzing schedule...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me to adjust your schedule..."
                  className="flex-1"
                  disabled={isTyping || isProcessingRef.current}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping || isProcessingRef.current}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Try: "Move gym to 2pm" or "Clear my afternoon"
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}