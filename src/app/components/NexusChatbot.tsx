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
  startDate: Date; // Required for AI functions to understand event timing
  endDate?: Date;
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

  // Use CalendarContext to invalidate cache and refresh calendar after changes
  const { invalidateCache: invalidateCalendarCache, fetchEvents: fetchCalendarContextEvents } = useCalendar();

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
        startDate: start,
        endDate: end,
      };
    } catch (error) {
      console.error('Error parsing MCP event:', error);
      return null;
    }
  };

  // Helper to parse MCP response and convert to ParsedEvent array
  const parseMcpEventsResponse = (response: any): ParsedEvent[] => {
    console.log('[Chatbot] parseMcpEventsResponse called with:', typeof response);

    try {
      let events: CalendarEvent[] = [];

      if (!response) {
        console.log('[Chatbot] Response is null/undefined');
        return [];
      }

      if (Array.isArray(response)) {
        console.log('[Chatbot] Response is array with', response.length, 'items');
        // Response is an array of content items
        const textContent = response.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          console.log('[Chatbot] Found text content, parsing JSON...');
          try {
            events = JSON.parse(textContent.text);
            console.log('[Chatbot] Parsed', events.length, 'events from text content');
          } catch (parseError) {
            console.error('[Chatbot] Error parsing JSON from text content:', parseError);
            return [];
          }
        } else if (response.length > 0 && typeof response[0] === 'object' && 'id' in response[0]) {
          // Response might be an array of events directly
          console.log('[Chatbot] Response is array of events directly');
          events = response as CalendarEvent[];
        } else {
          console.warn('[Chatbot] Unexpected response format:', response);
          return [];
        }
      } else if (typeof response === 'string') {
        // Response is a JSON string
        console.log('[Chatbot] Response is string, parsing JSON...');
        try {
          events = JSON.parse(response);
          console.log('[Chatbot] Parsed', events.length, 'events from string');
        } catch (parseError) {
          console.error('[Chatbot] Error parsing JSON string:', parseError);
          return [];
        }
      } else if (typeof response === 'object' && response.content) {
        // Response might be wrapped in a content object
        console.log('[Chatbot] Response has content property, extracting...');
        return parseMcpEventsResponse(response.content);
      } else {
        console.warn('[Chatbot] Unexpected response type:', typeof response, response);
        return [];
      }

      // Ensure events is an array
      if (!Array.isArray(events)) {
        console.warn('[Chatbot] Parsed events is not an array:', events);
        return [];
      }

      console.log('[Chatbot] Mapping', events.length, 'events to ParsedEvent format');
      const parsed = events
        .map(parseMcpEventToParsed)
        .filter((event): event is ParsedEvent => event !== null);

      console.log('[Chatbot] Successfully parsed', parsed.length, 'events');
      return parsed;
    } catch (error) {
      console.error('[Chatbot] Error in parseMcpEventsResponse:', error);
      return [];
    }
  };

  // Parse date references from user input (tomorrow, next week, Monday, etc.)
  // Returns a date range that includes the target date and provides context
  const parseDateFromInput = (userInput: string): { startDate: Date; endDate: Date } => {
    const lower = userInput.toLowerCase();
    const today = getToday(); // Use actual system date
    let targetDate = new Date(today);
    let useWeekRange = false;

    // Check for specific date references
    if (lower.includes('tomorrow')) {
      targetDate = addDays(today, 1);
    } else if (lower.includes('next week')) {
      targetDate = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
      useWeekRange = true;
    } else if (lower.includes('this week')) {
      targetDate = startOfWeek(today, { weekStartsOn: 1 });
      useWeekRange = true;
    } else if (lower.includes('next month')) {
      targetDate = addMonths(today, 1);
      useWeekRange = true; // Load the first week of next month
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

    // If no specific date mentioned, load the current week for context
    if (targetDate.getTime() === today.getTime() && !lower.includes('today')) {
      return {
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate: endOfWeek(today, { weekStartsOn: 1 }),
      };
    }

    // For week-based queries, return the full week
    if (useWeekRange) {
      return {
        startDate: startOfWeek(targetDate, { weekStartsOn: 1 }),
        endDate: endOfWeek(targetDate, { weekStartsOn: 1 }),
      };
    }

    // For specific day queries, load that day plus surrounding context (3 days before and after)
    // This helps the AI understand the broader schedule context
    return {
      startDate: startOfDay(addDays(targetDate, -1)),
      endDate: endOfDay(addDays(targetDate, 1)),
    };
  };

  // Load calendar events for context-awareness (loads current week by default)
  const loadCalendarEvents = useCallback(async (dateRange?: { startDate: Date; endDate: Date }): Promise<ParsedEvent[]> => {
    console.log('[Chatbot] loadCalendarEvents called, connected:', connected);

    if (!connected) {
      console.log('[Chatbot] Not connected, attempting to connect...');
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

      console.log('[Chatbot] Fetching events from', startDate.toISOString(), 'to', endDate.toISOString());

      const response = await callTool('list_events', {
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: 500, // Increased for week/month views
      });

      console.log('[Chatbot] MCP list_events raw response:', JSON.stringify(response).substring(0, 500));

      const parsedEvents = parseMcpEventsResponse(response);
      console.log('[Chatbot] Parsed events count:', parsedEvents.length);
      console.log('[Chatbot] Parsed events:', parsedEvents.map(e => ({ title: e.title, time: e.time, startDate: e.startDate?.toISOString() })));

      setCalendarEvents(parsedEvents);
      return parsedEvents || []; // Return events, ensure it's an array
    } catch (error) {
      console.error('[Chatbot] Error loading calendar events:', error);
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

    const today = getToday();
    const todayStr = format(today, 'EEEE, MMMM d, yyyy');

    let calendarContextText = '';
    if (calendarContext && calendarContext.length > 0) {
      // Format events with full date/time information
      const formattedEvents = calendarContext.map(e => {
        const dateStr = e.startDate ? format(e.startDate, 'EEE, MMM d, yyyy') : 'Unknown date';
        return `- "${e.title}" on ${dateStr} at ${e.time} (${e.duration}min, type: ${e.type})`;
      }).join('\n');

      calendarContextText = `

**TODAY'S DATE: ${todayStr}**

**USER'S CALENDAR EVENTS (from Google Calendar):**
${formattedEvents}

**CRITICAL RULES:**
1. ONLY reference events that are listed above. Do NOT invent, guess, or hallucinate any events.
2. If asked about the schedule and no events are listed, say "You don't have any events scheduled for that time period."
3. When answering questions about the schedule, be accurate and reference the exact event names and times shown above.
4. You can have normal conversations too - not every message is about scheduling.`;

      console.log('[Chatbot] Calendar context for AI:', formattedEvents);
    } else {
      calendarContextText = `

**TODAY'S DATE: ${todayStr}**

**USER'S CALENDAR:** No events found for the requested time period.

**CRITICAL RULES:**
1. Do NOT make up or hallucinate any events. The user has no events scheduled.
2. If asked about schedule, honestly say there are no events scheduled.
3. You can have normal conversations - not every message is about scheduling.`;

      console.log('[Chatbot] No calendar events to provide context');
    }

    const systemPrompt = `You are Kaisey, a friendly AI assistant for MBA students. You help with scheduling but can also have normal conversations.

**Your Capabilities:**
1. Answer questions about the user's schedule (using ONLY the calendar data provided below)
2. Help add, move, or remove calendar events
3. Have friendly conversations about anything

**Core Principles:**
- Be concise and conversational
- When discussing schedule, ONLY mention events that are explicitly listed in the calendar data below
- If no events are listed, say so honestly - do NOT invent fake events
- Not every message needs a scheduling action - sometimes users just want to chat or ask questions
${calendarContextText}

**When the user asks about their schedule:**
- Look at the CALENDAR EVENTS section above
- Only mention events that are actually listed there
- If the time period has no events, say "You don't have anything scheduled for [time period]"

**When the user wants to add/schedule something:**
- Acknowledge the request and confirm what you'll add
- Be helpful about suggesting times if they don't specify one

**NEVER:**
- Invent or hallucinate events that aren't in the calendar data
- Ask users to "list their events" when you already have calendar data
- Make up event names like random mixers, meetings, or activities that don't exist`;

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
          temperature: 0.4, // Reduced for more factual, less creative responses
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
      console.log('[Chatbot] Parsed date range:', {
        start: dateRange.startDate.toISOString(),
        end: dateRange.endDate.toISOString()
      });

      // Load events for the detected date range and use the returned events directly
      const relevantEvents = await loadCalendarEvents(dateRange);
      console.log('[Chatbot] Loaded events for AI context:', relevantEvents.length, 'events');

      // Ensure relevantEvents is an array (defensive programming)
      const eventsArray = Array.isArray(relevantEvents) ? relevantEvents : [];
      console.log('[Chatbot] Passing', eventsArray.length, 'events to callOpenAI');

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

      // Check for QUERY intent first - these should NOT trigger any calendar actions
      // Queries are asking about the schedule, not modifying it
      const hasQueryIntent = /\b(what('s| is| are)?|show|tell|list|summarize|summary|overview|how many|do i have|am i free|any(thing)?|events?( on| for| today| tomorrow| this| next)?)\b.*\b(schedule|calendar|events?|appointments?|plans?|busy|free|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|next week)\b/i.test(messageToSend) ||
        /\b(schedule|calendar|events?|plans?)\b.*\b(for|on|today|tomorrow|this|next)\b/i.test(messageToSend) && !/\b(add|create|schedule|book|set up|block)\b.*\b(for|at|on)\b/i.test(messageToSend) ||
        /^(what|show|tell|list|summarize|how|do i|am i|any)/i.test(messageToSend.trim());

      // Check for specific scheduling intents - expanded to include more common phrases
      // BUT exclude if it's a query intent
      const hasScheduleIntent = !hasQueryIntent && /\b(schedule|block time|study for)\b|add .* (at|to|for)|create .* (at|to|for)|put .* (at|on|in)|book|set up/i.test(messageToSend);
      const hasInsteadOfIntent = /instead of|replace/i.test(messageToSend);
      const hasDeleteIntent = /delete|cancel|remove|clear/i.test(messageToSend) &&
        !/don't delete|don't cancel|don't remove/i.test(messageToSend);
      const hasMoveIntent = !hasQueryIntent && /move|reschedule|shift|change.*(time|to \d)|push.*(to|back|forward)|edit|update|modify/i.test(messageToSend) &&
        !/don't move|don't reschedule|don't change/i.test(messageToSend);

      console.log('[Chatbot] Intent detection:', { hasQueryIntent, hasScheduleIntent, hasInsteadOfIntent, hasDeleteIntent, hasMoveIntent, lowerInput });
      
      // More conservative detection - only mark as action if it's proposing a specific action
      const actionPatterns = {
        move: /(?:i can|i'll|let me|i recommend|i suggest).*(?:move|reschedule|shift)/,
        cancel: /(?:i can|i'll|let me|i recommend|i suggest).*(?:cancel|remove|delete)/,
        add: /(?:i can|i'll|let me|i recommend|i suggest|schedule|block time).*(?:add|schedule|block|create|study for)/,
        suggest: /(?:i recommend|i suggest|you should).*(?:move|cancel|add|reschedule|optimize)/,
      };
      
      // Determine if this is a simple addition (low-stakes) or complex operation (requires approval)
      // NEVER treat query intents as additions
      const isSimpleAddition = !hasQueryIntent && hasScheduleIntent && !hasInsteadOfIntent &&
        !/(?:move|reschedule|shift|cancel|delete|replace|instead)/i.test(messageToSend);
      
      // Determine if this is a delete request
      const isSimpleDeletion = hasDeleteIntent && !hasScheduleIntent;
      
      // Check if action impacts hard blocks (requires approval)
      const impactsHardBlocks = /(?:class|meeting|interview|exam|deadline)/i.test(messageToSend) ||
        actionPatterns.move.test(lowerResponse) || actionPatterns.cancel.test(lowerResponse);

      // PRIORITY 0: Query intent - user is asking about their schedule, NOT modifying it
      // These should never trigger any actions - just show the AI response
      if (hasQueryIntent) {
        actionType = undefined;
        actionDetails = undefined;
        console.log('[Chatbot] User has QUERY intent - no action needed, just showing AI response');
      }
      // PRIORITY 1: Check user's explicit intent first (these take precedence)
      // User's delete intent should NOT be overridden by AI response patterns
      else if (hasDeleteIntent) {
        actionType = "cancel";
        actionDetails = "Delete event";
        console.log('[Chatbot] User has explicit DELETE intent');
      }
      // User's move/reschedule intent
      else if (hasMoveIntent && eventsArray.length > 0) {
        actionType = "move";
        actionDetails = "Reschedule event";
        console.log('[Chatbot] User has explicit MOVE/RESCHEDULE intent');
      }
      // User's add intent (only if not deleting or moving)
      else if (hasScheduleIntent && !hasInsteadOfIntent) {
        actionType = "add";
        actionDetails = "Schedule event";
        console.log('[Chatbot] User has explicit ADD intent');
      }
      // PRIORITY 2: Only check AI response patterns if user intent wasn't clear
      // But NEVER for queries
      else if (!hasQueryIntent) {
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
      }

      // For simple additions or deletions, auto-execute without approval
      // NEVER auto-execute for query intents
      const shouldAutoExecute = !hasQueryIntent && (
        (isSimpleAddition && actionType === "add" && !impactsHardBlocks) ||
        (isSimpleDeletion && actionType === "cancel")
      );

      console.log('[Chatbot] Action detection result:', {
        actionType,
        actionDetails,
        hasQueryIntent,
        isSimpleAddition,
        isSimpleDeletion,
        hasDeleteIntent,
        impactsHardBlocks,
        shouldAutoExecute,
        aiResponsePreview: aiResponse.substring(0, 100)
      });

      // Generate unique message ID and track it
      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      currentMessageIdRef.current = messageId;

      // For simple additions, use AI to extract event details intelligently
      // IMPORTANT: Only run for ADD actions, not deletions
      if (shouldAutoExecute && connected && actionType === "add" && isSimpleAddition) {
        console.log('[Chatbot] Auto-execute ADD: using AI to extract event details...');

        // Use AI to extract smart event details with calendar context
        const eventDetails = await extractEventDetailsWithAI(messageToSend, eventsArray)
          || parseEventDetails(messageToSend); // Fallback to basic parsing

        console.log('[Chatbot] Auto-execute: extracted event details:', eventDetails);

        if (eventDetails) {
          // Check for conflicts before creating the event
          const eventStart = eventDetails.start.getTime();
          const eventEnd = eventDetails.end.getTime();
          const conflictingEvent = eventsArray.find(existingEvent => {
            if (!existingEvent.startDate || !existingEvent.endDate) return false;
            const existingStart = existingEvent.startDate.getTime();
            const existingEnd = existingEvent.endDate.getTime();
            // Check if times overlap
            return (eventStart < existingEnd && eventEnd > existingStart);
          });

          if (conflictingEvent) {
            console.log('[Chatbot] Auto-execute: Conflict detected with:', conflictingEvent.title);
            // Don't auto-execute, show conflict message instead
            const conflictMessage: Message = {
              id: messageId,
              type: "agent",
              content: `I can't add "${eventDetails.title}" at ${format(eventDetails.start, 'h:mm a')} because you already have "${conflictingEvent.title}" scheduled at that time. Please specify a different time.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, conflictMessage]);
            return; // Don't create the event
          }

          // Add temporary message
          const tempMessage: Message = {
            id: messageId,
            type: "agent",
            content: `Adding "${eventDetails.title}" to your calendar on ${format(eventDetails.start, 'EEEE, MMM d')} at ${format(eventDetails.start, 'h:mm a')}...`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, tempMessage]);

          // Determine priority from user input
          const isHardBlock = /(?:class|meeting|interview|exam|deadline|must|required|critical)/i.test(messageToSend);
          const priority = isHardBlock ? "hard-block" : "flexible";

          console.log('[Chatbot] Auto-execute: calling create_event for:', eventDetails.title, 'on', format(eventDetails.start, 'EEEE, MMM d'), 'at', format(eventDetails.start, 'h:mm a'));

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
                description: `${eventDetails.title} scheduled for ${format(eventDetails.start, 'EEEE, MMM d')} at ${format(eventDetails.start, 'h:mm a')}`,
                action: {
                  label: "Undo",
                  onClick: async () => {
                    if (createdEventId) {
                      try {
                        await callTool('delete_event', {
                          calendarId: 'primary',
                          eventId: createdEventId,
                        });
                        invalidateCalendarCache();
                        await loadCalendarEvents();
                        // Refresh CalendarContext for app calendar views
                        const today = getToday();
                        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
                        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
                        await fetchCalendarContextEvents(weekStart, weekEnd);
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
                      content: `✓ Added "${eventDetails.title}" on ${format(eventDetails.start, 'EEEE, MMM d')} at ${format(eventDetails.start, 'h:mm a')}. ${googleCalendarLink ? `[View in Google Calendar](${googleCalendarLink})` : ''}`,
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

      // For simple deletions, use AI to find the event to delete
      // IMPORTANT: Only run for CANCEL/DELETE actions
      if (hasDeleteIntent && actionType === "cancel" && connected && eventsArray.length > 0) {
        console.log('[Chatbot] Auto-execute DELETE: finding event to delete...');

        // Use AI to find the matching event
        const eventToDelete = await findEventToDeleteWithAI(messageToSend, eventsArray);
        
        if (eventToDelete) {
          console.log('[Chatbot] Auto-execute delete: found event:', eventToDelete);

          // Add temporary message
          const tempMessage: Message = {
            id: messageId,
            type: "agent",
            content: `Deleting "${eventToDelete.title}" from your calendar...`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, tempMessage]);

          // Delete the event
          callTool('delete_event', {
            calendarId: 'primary',
            eventId: eventToDelete.id,
          }).then(async () => {
            console.log('[Chatbot] Auto-execute delete: event deleted');

            // Invalidate CalendarContext cache
            invalidateCalendarCache();

            // Reload calendar to update chatbot's local state
            const updatedEvents = await loadCalendarEvents();
            setSessionState(prev => ({
              ...prev,
              lastUpdate: new Date(),
              lastEvents: updatedEvents,
              lastAction: "cancel",
            }));

            // Also refresh CalendarContext so app calendar views update
            const today = getToday();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
            await fetchCalendarContextEvents(weekStart, weekEnd);

            // Import toast for notification
            const { toast: toastFn } = await import("sonner");
            
            // Show toast
            toastFn.success("Event deleted", {
              description: `"${eventToDelete.title}" has been removed from your calendar`,
            });

            // Update message to show success
            setMessages((prev) => prev.map((msg) => 
              msg.id === messageId 
                ? {
                    ...msg,
                    type: "agent" as const,
                    content: `✓ Deleted "${eventToDelete.title}" from your calendar.`,
                  }
                : msg
            ));
          }).catch((error) => {
            console.error("Error auto-executing delete:", error);
            const { toast: toastFn } = require("sonner");
            toastFn.error("Failed to delete event", {
              description: error.message || "Please try again",
            });

            // Update message to show error
            setMessages((prev) => prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: `Sorry, I couldn't delete that event. ${error.message || "Please try again."}`,
                  }
                : msg
            ));
          });

          // Return early - we've handled this as auto-execute
          return;
        } else {
          // Couldn't find matching event, let AI respond normally
          console.log('[Chatbot] Auto-execute delete: no matching event found');
        }
      }

      // For cancel actions that need approval, try to find the event ID
      let foundEventId: string | undefined;
      if (actionType === "cancel" && eventsArray.length > 0) {
        const eventToDelete = await findEventToDeleteWithAI(messageToSend, eventsArray);
        if (eventToDelete) {
          foundEventId = eventToDelete.id;
          actionDetails = `Delete "${eventToDelete.title}"`;
        }
      }

      // For move/reschedule actions, try to find the event ID
      if (actionType === "move" && eventsArray.length > 0) {
        const eventToMove = await findEventToMoveWithAI(messageToSend, eventsArray);
        if (eventToMove) {
          foundEventId = eventToMove.id;
          actionDetails = `Reschedule "${eventToMove.title}"`;
          console.log('[Chatbot] Found event to move:', eventToMove);
        } else {
          console.log('[Chatbot] Could not find event to move');
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
                eventId: foundEventId, // Include event ID for cancel actions
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
    const todayDayName = format(today, 'EEEE');
    const currentHour = new Date().getHours();

    // Pre-compute common date references to help the AI
    const tomorrow = addDays(today, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    // Compute day names for the next 7 days
    const dayReferences: string[] = [];
    for (let i = 0; i < 7; i++) {
      const futureDate = addDays(today, i);
      const dayName = format(futureDate, 'EEEE');
      const dateStr = format(futureDate, 'yyyy-MM-dd');
      dayReferences.push(`${dayName} = ${dateStr}`);
    }

    // Build a list of busy times from calendar events (all events, not just today)
    const busyTimes = calendarEvents
      .filter(e => e.startDate && !isNaN(e.startDate.getTime()))
      .map(e => ({
        title: e.title,
        time: e.time,
        duration: e.duration,
        date: format(e.startDate, 'yyyy-MM-dd'),
        dayName: format(e.startDate, 'EEEE')
      }));

    const prompt = `Extract event details from the user's request. Return ONLY valid JSON.

User request: "${userRequest}"

**DATE REFERENCE (use these exact dates):**
- Today: ${todayStr} (${todayDayName})
- Tomorrow: ${tomorrowStr}
${dayReferences.map(d => `- ${d}`).join('\n')}

Current time: ${currentHour}:00

**Existing calendar events:**
${busyTimes.length > 0 ? busyTimes.map(e => `- ${e.title} on ${e.date} (${e.dayName}) at ${e.time}`).join('\n') : 'No events scheduled'}

**Instructions:**
1. Extract a clear, concise event TITLE (e.g., "Dinner", "Gym Session", "Study Time")
2. Determine the DATE:
   - Use the DATE REFERENCE above to convert day names to actual dates
   - "tomorrow" = ${tomorrowStr}
   - "today" = ${todayStr}
   - If user says "Monday", "Tuesday", etc., use the corresponding date from DATE REFERENCE
   - If user specifies a specific date like "January 25" or "1/25", use that date
   - Default to today (${todayStr}) only if no date/day is mentioned
3. Determine the TIME:
   - If user specifies a time (e.g., "at 3pm", "at 15:00"), use it exactly
   - Convert 12-hour to 24-hour format (3pm = 15:00, 9am = 09:00)
   - If no time specified, pick a reasonable time (morning activities: 09:00, lunch: 12:00, dinner: 18:00, evening: 19:00)
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

  // AI-powered event finding for deletion - uses LLM to find the best matching event
  const findEventToDeleteWithAI = async (
    userRequest: string,
    calendarEvents: ParsedEvent[]
  ): Promise<{ id: string; title: string } | null> => {
    const apiKey = getOpenAIApiKey();
    if (!apiKey || calendarEvents.length === 0) return null;

    const today = getToday();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Build a list of events with their IDs
    const eventsList = calendarEvents
      .filter(e => e.startDate && !isNaN(e.startDate.getTime()))
      .map((e, index) => ({
        index,
        id: e.id,
        title: e.title,
        time: e.time,
        date: format(e.startDate, 'yyyy-MM-dd'),
        duration: e.duration
      }));

    if (eventsList.length === 0) return null;

    const prompt = `Find the event the user wants to delete. Return ONLY valid JSON.

User request: "${userRequest}"

Today's date: ${todayStr}

Available events:
${eventsList.map((e, i) => `${i + 1}. "${e.title}" on ${e.date} at ${e.time} (ID: ${e.id})`).join('\n')}

Instructions:
1. Find the event that best matches what the user wants to delete
2. Match by event title, time, or date as described in the user's request
3. If no clear match, return null

Return ONLY this JSON format, no other text:
{"eventIndex": 1, "eventId": "event_id_here", "eventTitle": "Event Title"}

If no match found, return: {"eventIndex": null}`;

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
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.eventIndex === null || !parsed.eventId) {
        return null;
      }

      console.log('[Chatbot] AI found event to delete:', parsed);

      return {
        id: parsed.eventId,
        title: parsed.eventTitle || 'Event'
      };
    } catch (error) {
      console.error('[Chatbot] AI event finding failed:', error);
      return null;
    }
  };

  // AI-powered event finding for moving/rescheduling - uses LLM to find the best matching event
  const findEventToMoveWithAI = async (
    userRequest: string,
    calendarEvents: ParsedEvent[]
  ): Promise<{ id: string; title: string } | null> => {
    const apiKey = getOpenAIApiKey();
    if (!apiKey || calendarEvents.length === 0) return null;

    const today = getToday();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Build a list of events with their IDs
    const eventsList = calendarEvents
      .filter(e => e.startDate && !isNaN(e.startDate.getTime()))
      .map((e, index) => ({
        index,
        id: e.id,
        title: e.title,
        time: e.time,
        date: format(e.startDate, 'yyyy-MM-dd'),
        duration: e.duration
      }));

    if (eventsList.length === 0) return null;

    const prompt = `Find the event the user wants to move/reschedule/edit. Return ONLY valid JSON.

User request: "${userRequest}"

Today's date: ${todayStr}

Available events:
${eventsList.map((e, i) => `${i + 1}. "${e.title}" on ${e.date} at ${e.time} (ID: ${e.id})`).join('\n')}

Instructions:
1. Find the event that the user wants to move, reschedule, shift, change, or edit
2. Match by event title, time, or date as described in the user's request
3. Look for phrases like "move X to...", "reschedule X...", "change X time...", "shift X...", "push X..."
4. If no clear match, return null

Return ONLY this JSON format, no other text:
{"eventIndex": 1, "eventId": "event_id_here", "eventTitle": "Event Title"}

If no match found, return: {"eventIndex": null}`;

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
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.eventIndex === null || !parsed.eventId) {
        return null;
      }

      console.log('[Chatbot] AI found event to move:', parsed);

      return {
        id: parsed.eventId,
        title: parsed.eventTitle || 'Event'
      };
    } catch (error) {
      console.error('[Chatbot] AI event finding for move failed:', error);
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
          // First try AI extraction which is smarter about understanding context
          // Then fall back to basic parsing
          const eventDetails = await extractEventDetailsWithAI(message.action.userRequest, calendarEvents)
            || parseEventDetails(message.action.userRequest);

          if (eventDetails) {
            console.log('[Chatbot] Parsed event details:', eventDetails);

            // Check for conflicts before creating the event
            const eventStart = eventDetails.start.getTime();
            const eventEnd = eventDetails.end.getTime();
            const conflictingEvent = calendarEvents.find(existingEvent => {
              if (!existingEvent.startDate || !existingEvent.endDate) return false;
              const existingStart = existingEvent.startDate.getTime();
              const existingEnd = existingEvent.endDate.getTime();
              // Check if times overlap
              return (eventStart < existingEnd && eventEnd > existingStart);
            });

            if (conflictingEvent) {
              console.log('[Chatbot] Conflict detected with:', conflictingEvent.title);
              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    type: "agent",
                    content: `I can't create this event because it conflicts with "${conflictingEvent.title}" at ${conflictingEvent.time}. Please specify a different time, like "add dinner at 8pm" or "schedule dinner for 6pm".`,
                    timestamp: new Date(),
                  },
                ]);
              }, 500);
              return;
            }

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
              onScheduleChange(message.action.type, `Created event: ${eventDetails.title} on ${format(eventDetails.start, 'EEEE, MMM d')} at ${format(eventDetails.start, 'h:mm a')}`);
            }
            
            // Add success message with sync status
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  type: "agent",
                  content: `✓ Synced to Google Calendar. Created "${eventDetails.title}" on ${format(eventDetails.start, 'EEEE, MMM d')} at ${format(eventDetails.start, 'h:mm a')}.${googleCalendarLink ? ` [View event](${googleCalendarLink})` : ''}`,
                  timestamp: new Date(),
                },
              ]);
            }, 500);
          } else {
            throw new Error('Could not parse event details from your request');
          }
        } else if (message.action.type === "move" && message.action.userRequest) {
          // Handle move/reschedule
          console.log('[Chatbot] Move action - eventId:', message.action.eventId, 'userRequest:', message.action.userRequest);

          // Use AI to extract new time details
          const eventDetails = await extractEventDetailsWithAI(message.action.userRequest, calendarEvents)
            || parseEventDetails(message.action.userRequest);

          if (!message.action.eventId) {
            // No event ID - show error
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  type: "agent",
                  content: "Sorry, I couldn't identify which event to reschedule. Please be more specific, like 'move gym to 3pm' or 'reschedule my meeting to tomorrow'.",
                  timestamp: new Date(),
                },
              ]);
            }, 500);
            return;
          }

          if (!eventDetails) {
            // No time details - show error
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  type: "agent",
                  content: "Sorry, I couldn't understand the new time. Please specify when you'd like to reschedule to, like 'move gym to 3pm tomorrow'.",
                  timestamp: new Date(),
                },
              ]);
            }, 500);
            return;
          }

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

          // Also refresh CalendarContext so app calendar views update
          const today = getToday();
          const weekStart = startOfWeek(today, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
          await fetchCalendarContextEvents(weekStart, weekEnd);

          // Refresh greeting with updated events
          if (updatedEvents.length > 0) {
            generatePersonalizedGreeting(updatedEvents);
          }

          // Notify parent component
          if (onScheduleChange) {
            onScheduleChange(message.action.type, `Rescheduled event: ${message.action.details}`);
          }

          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                type: "agent",
                content: `✓ Event rescheduled to ${format(eventDetails.start, 'EEEE, MMM d')} at ${format(eventDetails.start, 'h:mm a')} and synced to Google Calendar.`,
                timestamp: new Date(),
              },
            ]);
          }, 500);
        } else if (message.action.type === "cancel" && message.action.eventId) {
          // Handle delete/cancel event
          console.log('[Chatbot] Deleting event:', message.action.eventId);

          await callTool('delete_event', {
            calendarId: 'primary',
            eventId: message.action.eventId,
          });

          // Invalidate CalendarContext cache - components will refetch when needed
          invalidateCalendarCache();

          const updatedEvents = await loadCalendarEvents();
          setSessionState(prev => ({
            ...prev,
            lastUpdate: new Date(),
            lastEvents: updatedEvents,
            lastAction: "cancel",
          }));

          // Also refresh CalendarContext so app calendar views update
          const today = getToday();
          const weekStart = startOfWeek(today, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
          await fetchCalendarContextEvents(weekStart, weekEnd);

          // Refresh greeting with updated events
          if (updatedEvents.length > 0) {
            generatePersonalizedGreeting(updatedEvents);
          }
          
          // Notify parent component
          if (onScheduleChange) {
            onScheduleChange(message.action.type, `Deleted event: ${message.action.details}`);
          }
          
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                type: "agent",
                content: "✓ Event deleted and removed from Google Calendar.",
                timestamp: new Date(),
              },
            ]);
          }, 500);
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