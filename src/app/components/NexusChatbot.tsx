import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X, Brain, Check, Clock, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { getOpenAIApiKey } from "@/config/apiKey";
import { useMcpServer } from "@/hooks/useMcpServer";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, startOfDay, endOfDay } from "date-fns";

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
}

export function NexusChatbot({ onScheduleChange }: NexusChatbotProps) {
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
    const today = new Date();
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
      // Default to current week if no date range specified
      const today = new Date();
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userInput = inputValue.trim();
    setInputValue("");
    setIsTyping(true);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: userInput,
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
      const dateRange = parseDateFromInput(userInput);
      
      // Load events for the detected date range and use the returned events directly
      const relevantEvents = await loadCalendarEvents(dateRange);
      
      // Ensure relevantEvents is an array (defensive programming)
      const eventsArray = Array.isArray(relevantEvents) ? relevantEvents : [];

      // Call OpenAI API with calendar context
      const aiResponse = await callOpenAI(userInput, conversationHistory, eventsArray.length > 0 ? eventsArray : undefined);

      // Parse response to determine if it's an action or regular message
      // Only mark as action if it's clearly proposing a concrete, actionable change
      // Look for patterns like "I can move...", "I'll cancel...", "Let me add...", "I recommend moving..."
      const lowerResponse = aiResponse.toLowerCase();
      let actionType: "move" | "cancel" | "add" | "suggest" | undefined;
      let actionDetails = "";

      // More conservative detection - only mark as action if it's proposing a specific action
      const actionPatterns = {
        move: /(?:i can|i'll|let me|i recommend|i suggest).*(?:move|reschedule|shift)/,
        cancel: /(?:i can|i'll|let me|i recommend|i suggest).*(?:cancel|remove|delete)/,
        add: /(?:i can|i'll|let me|i recommend|i suggest).*(?:add|schedule|block|create)/,
        suggest: /(?:i recommend|i suggest|you should).*(?:move|cancel|add|reschedule|optimize)/,
      };

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
              userRequest: userInput, // Store user's original request for parsing
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
    
    // Extract duration (e.g., "for 15 mins", "15 minutes", "for 30 min")
    let durationMinutes = 60; // Default 1 hour
    const durationMatch = lower.match(/(?:for|duration:?)\s*(\d+)\s*(?:min(?:ute)?s?|mins?)/i);
    if (durationMatch) {
      durationMinutes = parseInt(durationMatch[1]);
    }
    
    // Determine date from user input (use same logic as parseDateFromInput)
    const today = new Date();
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
              Chat with Nexus Agent
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
                  <h3 className="font-semibold text-white text-sm">Nexus Agent</h3>
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
                    ) : message.type === "agent" ? (
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-[80%]">
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm whitespace-pre-line">{message.content}</p>
                            <span className="text-xs text-muted-foreground mt-1 block">
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
                              <Badge className="bg-blue-500">
                                {message.action?.type === "move" && <Clock className="w-3 h-3 mr-1" />}
                                {message.action?.type === "cancel" && <X className="w-3 h-3 mr-1" />}
                                {message.action?.type === "add" && <Calendar className="w-3 h-3 mr-1" />}
                                {message.action?.type === "suggest" && <Sparkles className="w-3 h-3 mr-1" />}
                                {message.action?.type}
                              </Badge>
                            </div>
                            <p className="text-sm mb-3">{message.content}</p>
                            
                            {message.action?.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveAction(message.id)}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectAction(message.id)}
                                  className="flex-1"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            )}
                            
                            {message.action?.status === "approved" && (
                              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                                <Check className="w-4 h-4" />
                                Approved & Executed
                              </div>
                            )}
                            
                            {message.action?.status === "rejected" && (
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <X className="w-4 h-4" />
                                Declined
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }}></span>
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
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
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