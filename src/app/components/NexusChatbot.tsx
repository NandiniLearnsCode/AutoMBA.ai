import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X, Brain, Check, Clock, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { getOpenAIApiKey } from "@/config/apiKey";
import { useMcpServer } from "@/hooks/useMcpServer";
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
  type: "user" | "agent" | "action";
  content: string;
  timestamp: Date;
  action?: {
    type: "move" | "cancel" | "add" | "suggest";
    details: string;
    status: "pending" | "approved" | "rejected";
    userRequest?: string; // Store the original user request for parsing
    onApprove?: () => void;
    onReject?: () => void;
  };
}

interface NexusChatbotProps {
  onScheduleChange?: (action: string, details: any) => void;
  onSendMessageFromExternal?: (message: string) => void;
  isHidden?: boolean; // For inline chat mode
}

export function NexusChatbot({ onScheduleChange, onSendMessageFromExternal, isHidden = false }: NexusChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "agent",
      content: "Good morning. I'm your Nexus Executive Agent. I can help you optimize your schedule, manage conflicts, and maximize your Triple Bottom Line. What would you like to adjust today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<ParsedEvent[]>([]); // Context-awareness: calendar events for relevant period
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use MCP server hook for Google Calendar
  const { connected, loading: mcpLoading, error: mcpError, callTool, connect } = useMcpServer('google-calendar');

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
    const today = getToday(); // Use global "today" (Jan 21, 2026)
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
      const today = getToday(); // Use global "today" (Jan 21, 2026)
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

  // Load current week's events when component mounts and MCP is connected
  useEffect(() => {
    if (connected && !mcpLoading) {
      loadCalendarEvents();
    }
  }, [connected, mcpLoading, loadCalendarEvents]);

  // Connect to MCP on mount
  useEffect(() => {
    if (!connected && !mcpLoading) {
      connect();
    }
  }, []);

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

    const systemPrompt = `You are the Nexus Executive Agent, an AI assistant helping MBA students optimize their schedule to maximize the Triple Bottom Line: Academic Excellence, Professional Networking, and Personal Well-being.

Your role is to:
- Help users optimize their schedule based on their stated priorities
- Consider tradeoffs when making suggestions (e.g., moving a study session might affect academic performance, but could create space for networking)
- Analyze calendar conflicts and suggest solutions
- Provide specific, actionable suggestions (e.g., "I recommend moving [Event X] from [Time A] to [Time B] to accommodate [Priority Y]")
- When suggesting actions, explain the reasoning and tradeoffs clearly
- Be concise, professional, and action-oriented

${calendarContextText}

When suggesting actions (moving, canceling, adding events), format your response clearly so the user understands what action you're proposing and why it benefits their stated priorities.`;

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

    // Use functional update to get the latest messages including the new user message
    let currentMessages: Message[] = [];
    setMessages((prev) => {
      currentMessages = [...prev, userMessage];
      return currentMessages;
    });

    try {
      // Build conversation history from previous messages (excluding the new user message, as it will be added in callOpenAI)
      // Include user, agent, and action messages (action messages are also part of the conversation)
      const previousMessages = currentMessages.slice(0, -1); // Exclude the last message (the new user message)
      const conversationHistory = previousMessages
        .filter(msg => {
          // Include user and agent messages
          if (msg.type === "user" || msg.type === "agent") return true;
          // Include action messages that have been resolved (approved/rejected)
          if (msg.type === "action" && msg.action?.status !== "pending") return true;
          return false;
        })
        .map(msg => {
          // Convert action messages to assistant messages for the API
          if (msg.type === "action" && msg.action?.status !== "pending") {
            const statusText = msg.action.status === "approved" ? " (approved)" : " (declined)";
            return {
              role: "assistant" as const,
              content: msg.content + statusText,
            };
          }
          return {
            role: (msg.type === "user" ? "user" : "assistant") as const,
            content: msg.content,
          };
        });

      // Parse date range from user input and load relevant events
      const dateRange = parseDateFromInput(messageToSend);
      
      // Load events for the detected date range and use the returned events directly
      const relevantEvents = await loadCalendarEvents(dateRange);
      
      // Ensure relevantEvents is an array (defensive programming)
      const eventsArray = Array.isArray(relevantEvents) ? relevantEvents : [];

      // Call OpenAI API with calendar context
      const aiResponse = await callOpenAI(messageToSend, conversationHistory, eventsArray.length > 0 ? eventsArray : undefined);

      // Parse response to determine if it's an action or regular message
      // Only mark as action if it's clearly proposing a concrete, actionable change
      // Look for patterns like "I can move...", "I'll cancel...", "Let me add...", "I recommend moving..."
      const lowerResponse = aiResponse.toLowerCase();
      let actionType: "move" | "cancel" | "add" | "suggest" | undefined;
      let actionDetails = "";

      // Enhanced intent parsing for scheduling keywords
      const lowerInput = messageToSend.toLowerCase();
      
      // Check for specific scheduling intents
      const hasScheduleIntent = /schedule|block time|study for/i.test(messageToSend);
      const hasInsteadOfIntent = /instead of|replace/i.test(messageToSend);
      
      // More conservative detection - only mark as action if it's proposing a specific action
      const actionPatterns = {
        move: /(?:i can|i'll|let me|i recommend|i suggest).*(?:move|reschedule|shift)/,
        cancel: /(?:i can|i'll|let me|i recommend|i suggest).*(?:cancel|remove|delete)/,
        add: /(?:i can|i'll|let me|i recommend|i suggest|schedule|block time).*(?:add|schedule|block|create|study for)/,
        suggest: /(?:i recommend|i suggest|you should).*(?:move|cancel|add|reschedule|optimize)/,
      };
      
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

      const agentMessage: Message = actionType
        ? {
            id: (Date.now() + 1).toString(),
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
            id: (Date.now() + 1).toString(),
            type: "agent",
            content: aiResponse,
            timestamp: new Date(),
          };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: error instanceof Error 
          ? `I apologize, but I encountered an error: ${error.message}. Please check your API key configuration.`
          : "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper to parse event details from user request
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
    
    // Extract duration - improved regex to catch more variations
    // Matches: "for 15 mins", "15 minutes", "for 30 min", "30 mins", "15min", etc.
    let durationMinutes = 60; // Default 1 hour
    const durationPatterns = [
      /(?:for|duration:?)\s*(\d+)\s*(?:min(?:ute)?s?|mins?)/i,  // "for 15 mins"
      /(\d+)\s*(?:min(?:ute)?s?|mins?)/i,                        // "15 mins" (without "for")
      /(\d+)\s*(?:hour|hr|hrs|hours?)/i,                         // "1 hour", "2 hours"
    ];
    
    for (const pattern of durationPatterns) {
      const durationMatch = lower.match(pattern);
      if (durationMatch) {
        const value = parseInt(durationMatch[1]);
        if (pattern.source.includes('hour')) {
          durationMinutes = value * 60;
        } else {
          durationMinutes = value;
        }
        break; // Use first match
      }
    }
    
    // Determine date from user input (use same logic as parseDateFromInput)
    const today = getToday(); // Use global "today" for consistency
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
    
    // Extract title - improved extraction to preserve important words
    let title = 'Event';
    
    // More targeted stop words - only remove truly unnecessary words
    const stopWords = ['add', 'an', 'a', 'the', 'event', 'schedule', 'block', 'time', 'pm', 'am', 'today', 'tomorrow', 
                       'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 
                       'week', 'month', 'mins', 'minutes', 'min', 'duration', 'for', 'at', 'on', 'in'];
    
    // Patterns to remove: time and duration
    const timePattern = /(\d{1,2}):?(\d{2})?\s*(AM|PM)?/gi;
    const durationPattern = /(?:for|duration:?)?\s*\d+\s*(?:min(?:ute)?s?|mins?|hour|hr|hrs|hours?)/gi;
    
    // Remove time and duration from the request
    let cleanedRequest = userRequest
      .replace(timePattern, '')
      .replace(durationPattern, '')
      .trim();
    
    // Split into words and filter out stop words
    const words = cleanedRequest
      .split(/\s+/)
      .filter(w => w.length > 0)
      .filter(w => !stopWords.includes(w.toLowerCase()))
      .filter(w => !w.match(/^\d+$/)); // Remove standalone numbers
    
    if (words.length > 0) {
      // Join all remaining words (don't filter by length - preserve words like "dinner")
      title = words.join(' ').trim();
      
      // If title is still empty, try a different approach: extract before time/duration
      if (!title || title.length < 2) {
        // Try to extract text before the time
        const beforeTime = userRequest.split(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i)[0].trim();
        if (beforeTime) {
          const beforeWords = beforeTime
            .split(/\s+/)
            .filter(w => w.length > 0 && !stopWords.includes(w.toLowerCase()));
          if (beforeWords.length > 0) {
            title = beforeWords.join(' ').trim();
          }
        }
      }
    }
    
    // Capitalize first letter of each word (title case)
    if (title && title.length > 0) {
      title = title
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Calculate end time based on duration
    const endTime = new Date(eventDate);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
    
    return { title: title || 'Event', start: eventDate, end: endTime };
  };

  const handleApproveAction = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.action
          ? { ...msg, action: { ...msg.action, status: "approved" as const } }
          : msg
      )
    );

    const message = messages.find((m) => m.id === messageId);
    
    if (message?.action) {
      try {
        // Ensure connected to MCP
        if (!connected) {
          await connect();
        }
        
        // Execute calendar operation based on action type
        if (message.action.type === "add" && message.action.userRequest) {
          // Parse event details from user request
          const eventDetails = parseEventDetails(message.action.userRequest);
          
          if (eventDetails) {
            // Use MCP create_event tool
            await callTool('create_event', {
              calendarId: 'primary',
              summary: eventDetails.title,
              description: 'Created via Nexus Agent',
              start: {
                dateTime: eventDetails.start.toISOString(),
              },
              end: {
                dateTime: eventDetails.end.toISOString(),
              },
            });
            
            // Reload calendar events to refresh context
            await loadCalendarEvents();
            
            // Notify parent component
            if (onScheduleChange) {
              onScheduleChange(message.action.type, `Created event: ${eventDetails.title} at ${eventDetails.start.toLocaleTimeString()}`);
            }
            
            // Add success message
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  type: "agent",
                  content: `✓ Calendar updated successfully. Created "${eventDetails.title}" at ${eventDetails.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                  timestamp: new Date(),
                },
              ]);
            }, 500);
          } else {
            throw new Error('Could not parse event details from your request');
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
      // Clear messages and reload calendar, but don't automatically send suggestions
      setMessages([{
        id: "1",
        type: "agent",
        content: "Good morning. I'm your Nexus Executive Agent. I can help you optimize your schedule, manage conflicts, and maximize your Triple Bottom Line. What would you like to adjust today?",
        timestamp: new Date(),
      }]);
      // Reload calendar in background (day, week, month)
      const today = getToday();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      
      await Promise.all([
        loadCalendarEvents({ startDate: dayStart, endDate: dayEnd }),
        loadCalendarEvents({ startDate: weekStart, endDate: weekEnd }),
        loadCalendarEvents({ startDate: monthStart, endDate: monthEnd }),
      ]);
      // Calendar is reloaded, but we wait for user to explicitly ask for suggestions
    };
    (window as any).__nexusChatbotLoadCalendar = loadCalendarEvents;
    (window as any).__nexusChatbotHandleApprove = handleApproveAction;
    (window as any).__nexusChatbotHandleReject = handleRejectAction;
    (window as any).__nexusChatbotGenerateSuggestions = generateInitialSuggestions;
    return () => {
      delete (window as any).__nexusChatbotSendMessage;
      delete (window as any).__nexusChatbotMessages;
      delete (window as any).__nexusChatbotIsTyping;
      delete (window as any).__nexusChatbotRefresh;
      delete (window as any).__nexusChatbotLoadCalendar;
      delete (window as any).__nexusChatbotHandleApprove;
      delete (window as any).__nexusChatbotHandleReject;
      delete (window as any).__nexusChatbotGenerateSuggestions;
    };
  }, [messages, isTyping, loadCalendarEvents, generateInitialSuggestions]);

  // If hidden mode, just expose the send function and return null
  if (isHidden) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-24 z-50">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 relative group transition-all duration-300 hover:scale-110 hover:shadow-purple-500/50"
            >
              <MessageSquare className="w-6 h-6 text-white drop-shadow-lg" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white shadow-lg animate-pulse"></span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-lg">
                Chat with Nexus Agent
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </Button>
          </motion.div>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Card className="h-full flex flex-col border-0 shadow-2xl overflow-hidden bg-white/95 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-lg border border-white/30">
                  <Brain className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight">Nexus Agent</h3>
                  <p className="text-xs text-white/90 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shadow-sm shadow-emerald-400"></span>
                    Active
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 p-0 text-white hover:bg-white/25 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 bg-gradient-to-b from-gray-50/50 to-white">
              <div className="p-5 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {message.type === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-3.5 shadow-lg shadow-indigo-500/30">
                          <p className="text-sm leading-relaxed font-medium">{message.content}</p>
                          <span className="text-xs opacity-80 mt-1.5 block font-light">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ) : message.type === "agent" ? (
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 border-2 border-white">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div className="max-w-[80%]">
                          <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-md">
                            <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">{message.content}</p>
                            <span className="text-xs text-gray-500 mt-2 block font-light">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Action message
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 border-2 border-white">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="max-w-[80%] flex-1">
                          <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-4 shadow-lg">
                            <div className="flex items-start gap-2 mb-3">
                              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-sm px-2.5 py-1">
                                {message.action?.type === "move" && <Clock className="w-3 h-3 mr-1.5" />}
                                {message.action?.type === "cancel" && <X className="w-3 h-3 mr-1.5" />}
                                {message.action?.type === "add" && <Calendar className="w-3 h-3 mr-1.5" />}
                                {message.action?.type === "suggest" && <Sparkles className="w-3 h-3 mr-1.5" />}
                                <span className="font-semibold capitalize">{message.action?.type}</span>
                              </Badge>
                            </div>
                            <p className="text-sm mb-4 text-gray-700 leading-relaxed">{message.content}</p>
                            
                            {message.action?.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveAction(message.id)}
                                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectAction(message.id)}
                                  className="flex-1 border-gray-300 hover:bg-gray-50 shadow-sm"
                                >
                                  <X className="w-3.5 h-3.5 mr-1.5" />
                                  Decline
                                </Button>
                              </div>
                            )}
                            
                            {message.action?.status === "approved" && (
                              <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                                <Check className="w-4 h-4" />
                                Approved & Executed
                              </div>
                            )}
                            
                            {message.action?.status === "rejected" && (
                              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <X className="w-4 h-4" />
                                Declined
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 border-2 border-white">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-md">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-white/80 backdrop-blur-sm border-gray-200">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me to adjust your schedule..."
                  className="flex-1 border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded-xl shadow-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2.5 font-light">
                Try: "Move gym to 2pm" or "Clear my afternoon"
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </>
  );
}