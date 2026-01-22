import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, Check, Plus, Minus, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";

interface CalendarAction {
  type: "add" | "remove" | "replace";
  event: {
    title: string;
    time: string;
    duration: number;
  };
  replaceWith?: {
    title: string;
    time: string;
    duration: number;
  };
}

interface Message {
  id: string;
  type: "user" | "agent" | "action";
  content: string;
  timestamp: Date;
  action?: CalendarAction & {
    status: "pending" | "approved" | "rejected";
  };
}

interface ConversationMemory {
  preferences: string[];
  recentActions: string[];
  context: string[];
}

interface KaiseyChatbotProps {
  onScheduleChange: (action: CalendarAction) => void;
  onFocusChange?: (focus: string) => void;
  variant?: "widget" | "panel";
}

export function KaiseyChatbot({ onScheduleChange, onFocusChange, variant = "floating" }: KaiseyChatbotProps) {
  const [isOpen, setIsOpen] = useState(variant === "widget");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "agent",
      content: "Hi Alex! I'm Kaisey, your personal MBA Co-Pilot. What's your priority today? I can help optimize your schedule.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [memory, setMemory] = useState<ConversationMemory>({
    preferences: ["Prefers morning workouts at 6 AM", "Avoids back-to-back meetings", "Needs 15min travel buffers", "Most productive 9-11 AM"],
    recentActions: [],
    context: ["Recruiting focus this week", "Goldman Sachs info session today at 12 PM", "Strategy Canvas quiz at 11 AM", "Low HRV - needs recovery"],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && variant === "floating") {
      inputRef.current.focus();
    }
  }, [isOpen, variant]);

  const processUserRequest = (input: string): Message[] => {
    const lowerInput = input.toLowerCase();
    const responses: Message[] = [];

    // User message
    responses.push({
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    });

    // Update memory with new context
    const newMemory = { ...memory };
    if (lowerInput.includes("prefer") || lowerInput.includes("like")) {
      newMemory.preferences.push(`User mentioned: ${input}`);
    }

    // Assignment scheduling detection
    if ((lowerInput.includes("schedule") || lowerInput.includes("add time") || lowerInput.includes("block time") || lowerInput.includes("study time")) && 
        (lowerInput.includes("valuation") || lowerInput.includes("case study") || lowerInput.includes("quiz") || 
         lowerInput.includes("assignment") || lowerInput.includes("exam") || lowerInput.includes("marketing") || 
         lowerInput.includes("operations") || lowerInput.includes("ethics"))) {
      
      let assignmentTitle = "";
      let studyTime = "14:00";
      let duration = 120;
      
      // Detect specific assignments
      if (lowerInput.includes("valuation")) {
        assignmentTitle = "Study: Valuation Case Study";
      } else if (lowerInput.includes("marketing")) {
        assignmentTitle = "Study: Marketing Mix Analysis";
      } else if (lowerInput.includes("operations")) {
        assignmentTitle = "Study: Operations Group Project";
      } else if (lowerInput.includes("ethics")) {
        assignmentTitle = "Study: Ethics Discussion Post";
      } else if (lowerInput.includes("quiz")) {
        assignmentTitle = "Study: Strategy Canvas Quiz";
      } else {
        assignmentTitle = "Study: Assignment Work";
      }
      
      // Detect time preferences
      if (lowerInput.match(/(\d+)\s*(pm|am)/)) {
        const timeMatch = lowerInput.match(/(\d+):?(\d+)?\s*(pm|am)/);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] || "00";
          const period = timeMatch[3].toLowerCase();
          
          if (period === "pm" && hour !== 12) hour += 12;
          if (period === "am" && hour === 12) hour = 0;
          
          studyTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
        }
      } else if (lowerInput.includes("morning")) {
        studyTime = "09:00";
      } else if (lowerInput.includes("afternoon")) {
        studyTime = "14:00";
      } else if (lowerInput.includes("evening")) {
        studyTime = "18:00";
      }
      
      // Detect duration
      if (lowerInput.match(/(\d+)\s*(hour|hr)/)) {
        const durationMatch = lowerInput.match(/(\d+)\s*(hour|hr)/);
        if (durationMatch) duration = parseInt(durationMatch[1]) * 60;
      } else if (lowerInput.match(/(\d+)\s*(min|minute)/)) {
        const durationMatch = lowerInput.match(/(\d+)\s*(min|minute)/);
        if (durationMatch) duration = parseInt(durationMatch[1]);
      }
      
      // Check if we need to replace existing event
      const shouldReplace = lowerInput.includes("replace") || lowerInput.includes("instead of") || lowerInput.includes("move");
      
      if (shouldReplace) {
        let eventToReplace = "";
        if (lowerInput.includes("gym")) eventToReplace = "Gym Session";
        else if (lowerInput.includes("coffee") || lowerInput.includes("networking")) eventToReplace = "Coffee Chat: Sarah (McKinsey)";
        else if (lowerInput.includes("goldman")) eventToReplace = "Goldman Sachs Info Session";
        
        if (eventToReplace) {
          responses.push({
            id: (Date.now() + 1).toString(),
            type: "agent",
            content: `I'll replace your ${eventToReplace} with ${assignmentTitle}:`,
            timestamp: new Date(),
          });
          
          responses.push({
            id: (Date.now() + 2).toString(),
            type: "action",
            content: "",
            timestamp: new Date(),
            action: {
              type: "replace",
              event: { title: eventToReplace, time: "13:00", duration: 45 },
              replaceWith: { title: assignmentTitle, time: studyTime, duration: duration },
              status: "pending",
            },
          });
        }
      } else {
        responses.push({
          id: (Date.now() + 1).toString(),
          type: "agent",
          content: `Perfect! I'll add ${assignmentTitle} to your calendar:`,
          timestamp: new Date(),
        });
        
        responses.push({
          id: (Date.now() + 2).toString(),
          type: "action",
          content: "",
          timestamp: new Date(),
          action: {
            type: "add",
            event: { title: assignmentTitle, time: studyTime, duration: duration },
            status: "pending",
          },
        });
      }
      
      newMemory.recentActions.push(`Scheduled study time for assignment`);
      setMemory(newMemory);
      return responses;
    }

    // Priority detection and schedule optimization
    if (lowerInput.includes("priority") || lowerInput.includes("priorities") || 
        lowerInput.includes("focus on") || lowerInput.includes("important") ||
        lowerInput.includes("need to")) {
      
      let priority = "";
      let priorityType = "";
      let scheduleActions: CalendarAction[] = [];
      
      // Detect priority type
      if (lowerInput.includes("recruit") || lowerInput.includes("career") || lowerInput.includes("job")) {
        priority = "recruiting and career development";
        priorityType = "recruiting";
        
        // Notify parent about focus change
        if (onFocusChange) {
          onFocusChange("Recruiting & Career Development");
        }
        
        scheduleActions = [
          {
            type: "replace",
            event: { title: "Gym Session", time: "13:00", duration: 45 },
            replaceWith: { title: "Gym Session", time: "06:00", duration: 45 }
          },
          {
            type: "add",
            event: { title: "Goldman Sachs Prep", time: "11:30", duration: 30 }
          },
          {
            type: "replace",
            event: { title: "Coffee Chat: Sarah (McKinsey)", time: "10:15", duration: 45 },
            replaceWith: { title: "Coffee Chat: Sarah (McKinsey)", time: "10:15", duration: 60 }
          }
        ];
      } else if (lowerInput.includes("study") || lowerInput.includes("academic") || lowerInput.includes("exam") || lowerInput.includes("class")) {
        priority = "academics and studying";
        priorityType = "academics";
        
        // Notify parent about focus change
        if (onFocusChange) {
          onFocusChange("Academic Excellence");
        }
        
        scheduleActions = [
          {
            type: "remove",
            event: { title: "Gym Session", time: "13:00", duration: 45 }
          },
          {
            type: "remove",
            event: { title: "Coffee Chat: Sarah (McKinsey)", time: "10:15", duration: 45 }
          },
          {
            type: "add",
            event: { title: "Focused Study Block", time: "14:00", duration: 120 }
          }
        ];
      } else if (lowerInput.includes("health") || lowerInput.includes("recovery") || lowerInput.includes("rest") || lowerInput.includes("well-being")) {
        priority = "health and recovery";
        priorityType = "health";
        
        // Notify parent about focus change
        if (onFocusChange) {
          onFocusChange("Health & Well-being");
        }
        
        scheduleActions = [
          {
            type: "replace",
            event: { title: "Coffee Chat: Sarah (McKinsey)", time: "10:15", duration: 45 },
            replaceWith: { title: "Coffee Chat: Sarah (McKinsey) - Video Call", time: "10:15", duration: 45 }
          },
          {
            type: "replace",
            event: { title: "Gym Session", time: "13:00", duration: 45 },
            replaceWith: { title: "Light Yoga & Stretching", time: "13:00", duration: 30 }
          },
          {
            type: "add",
            event: { title: "Meditation Break", time: "15:00", duration: 30 }
          }
        ];
      } else if (lowerInput.includes("network") || lowerInput.includes("connection") || lowerInput.includes("relationship")) {
        priority = "networking and building connections";
        priorityType = "networking";
        
        // Notify parent about focus change
        if (onFocusChange) {
          onFocusChange("Professional Networking");
        }
        
        scheduleActions = [
          {
            type: "replace",
            event: { title: "Coffee Chat: Sarah (McKinsey)", time: "10:15", duration: 45 },
            replaceWith: { title: "Coffee Chat: Sarah (McKinsey)", time: "10:15", duration: 60 }
          },
          {
            type: "add",
            event: { title: "Goldman Sachs Follow-up", time: "13:00", duration: 15 }
          },
          {
            type: "add",
            event: { title: "Lunch with Classmates", time: "13:30", duration: 60 }
          }
        ];
      } else {
        // Generic priority mentioned
        priority = "your stated goals";
        priorityType = "general";
        scheduleActions = [
          {
            type: "add",
            event: { title: "Protected Focus Time", time: "09:00", duration: 120 }
          },
          {
            type: "add",
            event: { title: "Travel Buffer", time: "11:45", duration: 15 }
          },
          {
            type: "add",
            event: { title: "Deep Work Block", time: "14:30", duration: 90 }
          }
        ];
      }

      responses.push({
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: `Got it, Alex! I understand ${priority} is your top priority today. Here are my recommended calendar changes:`,
        timestamp: new Date(),
      });

      // Create action items for each suggested change
      scheduleActions.forEach((calAction, index) => {
        responses.push({
          id: (Date.now() + 2 + index).toString(),
          type: "action",
          content: "", // Content will be rendered based on action type in UI
          timestamp: new Date(),
          action: {
            ...calAction,
            status: "pending",
          },
        });
      });

      newMemory.context.push(`Priority set: ${priority}`);
      newMemory.preferences.push(`Prioritizes ${priority}`);
      
    } else if (lowerInput.includes("move") || lowerInput.includes("reschedule")) {
      let eventToMove = "event";
      let newTime = "later";
      
      if (lowerInput.includes("gym")) eventToMove = "Gym Session";
      if (lowerInput.includes("meeting")) eventToMove = "meeting";
      if (lowerInput.includes("lunch")) eventToMove = "lunch";
      if (lowerInput.includes("study")) eventToMove = "study session";
      
      if (lowerInput.match(/\d+\s*(pm|am)/)) {
        const timeMatch = lowerInput.match(/(\d+)\s*(pm|am)/);
        if (timeMatch) newTime = `${timeMatch[1]} ${timeMatch[2].toUpperCase()}`;
      } else if (lowerInput.includes("tomorrow")) {
        newTime = "tomorrow morning";
      } else if (lowerInput.includes("afternoon")) {
        newTime = "this afternoon";
      }

      responses.push({
        id: (Date.now() + 1).toString(),
        type: "action",
        content: "",
        timestamp: new Date(),
        action: {
          type: "replace",
          event: { title: eventToMove, time: "13:00", duration: 45 },
          replaceWith: { title: eventToMove, time: newTime === "tomorrow morning" ? "06:00" : "14:00", duration: 45 },
          status: "pending",
        },
      });
      
      newMemory.recentActions.push(`Suggested moving ${eventToMove} to ${newTime}`);
    } else if (lowerInput.includes("remember") || lowerInput.includes("recall") || lowerInput.includes("memory")) {
      responses.push({
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: `Here's what I remember about you:\n\n**Preferences:**\n${memory.preferences.map(p => `• ${p}`).join('\n')}\n\n**Recent Actions:**\n${memory.recentActions.slice(-3).map(a => `• ${a}`).join('\n')}\n\n**Current Context:**\n${memory.context.map(c => `• ${c}`).join('\n')}`,
        timestamp: new Date(),
      });
    } else {
      responses.push({
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "I can help you optimize your schedule! Try:\n• \"My priority today is recruiting\"\n• \"My priority is academics\"\n• \"My priority is health\"\n• \"My priority is networking\"\n\nOr ask me to move specific events!",
        timestamp: new Date(),
      });
    }

    setMemory(newMemory);
    return responses;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    setIsTyping(true);
    const newMessages = processUserRequest(inputValue);
    
    setMessages((prev) => [...prev, newMessages[0]]);
    setInputValue("");

    setTimeout(() => {
      setMessages((prev) => [...prev, ...newMessages.slice(1)]);
      setIsTyping(false);
    }, 800);
  };

  const handleApproveAction = (messageId: string) => {
    // Find the message BEFORE updating state to avoid stale data
    const message = messages.find((m) => m.id === messageId);
    
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.action
          ? { ...msg, action: { ...msg.action, status: "approved" as const } }
          : msg
      )
    );

    if (message?.action && onScheduleChange) {
      const { status, ...actionWithoutStatus } = message.action;
      console.log("Calling onScheduleChange with:", actionWithoutStatus);
      onScheduleChange(actionWithoutStatus);
      
      // Update memory
      setMemory(prev => ({
        ...prev,
        recentActions: [...prev.recentActions, `Approved: ${message.action!.event.title}`],
      }));
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "agent",
          content: "✓ Calendar updated successfully. I've saved this preference for future recommendations.",
          timestamp: new Date(),
        },
      ]);
    }, 500);
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
          content: "Understood. I'll remember this preference. What alternative would work better for you?",
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

  const renderActionMessage = (message: Message) => {
    if (!message.action) return null;

    const { type, event, replaceWith, status } = message.action;
    const actionIcon = type === "add" ? Plus : type === "remove" ? Minus : RefreshCw;
    const ActionIcon = actionIcon;
    const actionColor = type === "add" ? "bg-green-500" : type === "remove" ? "bg-red-500" : "bg-blue-500";

    return (
      <div className="flex gap-2">
        <div className={`w-6 h-6 rounded-full ${actionColor} flex items-center justify-center shrink-0`}>
          <ActionIcon className="w-3 h-3 text-white" />
        </div>
        <div className="max-w-[80%] flex-1">
          <div className={`rounded-lg border-2 ${status === "approved" ? "border-green-500 bg-green-500/5" : status === "rejected" ? "border-gray-300 bg-gray-100" : "border-blue-500 bg-blue-500/5"} p-3`}>
            <Badge className={`${actionColor} text-white text-xs mb-2`}>
              {type === "add" ? "ADD" : type === "remove" ? "REMOVE" : "REPLACE"}
            </Badge>
            
            {type === "add" && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-600">+ Add to calendar:</p>
                <div className="text-xs bg-white border rounded p-2">
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-muted-foreground">{event.time} • {event.duration} min</div>
                </div>
              </div>
            )}
            
            {type === "remove" && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-600">− Remove from calendar:</p>
                <div className="text-xs bg-white border rounded p-2 opacity-60 line-through">
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-muted-foreground">{event.time} • {event.duration} min</div>
                </div>
              </div>
            )}
            
            {type === "replace" && replaceWith && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">− Current:</p>
                  <div className="text-xs bg-white border rounded p-2 opacity-60">
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-muted-foreground">{event.time} • {event.duration} min</div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-1">+ Replace with:</p>
                  <div className="text-xs bg-white border-2 border-green-500 rounded p-2">
                    <div className="font-semibold">{replaceWith.title}</div>
                    <div className="text-muted-foreground">{replaceWith.time} • {replaceWith.duration} min</div>
                  </div>
                </div>
              </div>
            )}
            
            {status === "pending" && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleApproveAction(message.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white h-7 text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectAction(message.id)}
                  className="flex-1 h-7 text-xs"
                >
                  Decline
                </Button>
              </div>
            )}
            
            {status === "approved" && (
              <div className="flex items-center gap-1 text-green-600 text-xs font-semibold mt-2">
                <Check className="w-3 h-3" />
                Approved & Applied
              </div>
            )}

            {status === "rejected" && (
              <div className="text-xs text-muted-foreground mt-2">
                Declined
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Widget variant (always visible at top)
  if (variant === "widget") {
    return (
      <Card className="p-4 border-2 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Chat with Kaisey
              </h3>
              <p className="text-xs text-muted-foreground">Tell me your priority and I'll optimize your schedule</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., 'Schedule time for valuation case study today'"
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

        {messages.length > 1 && (
          <div className="border-t pt-4">
            <ScrollArea className="h-[450px]">
              <div className="space-y-3 pr-4">
                {messages.slice(1).map((message) => (
                  <div key={message.id}>
                    {message.type === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-lg bg-blue-500 text-white p-2">
                          <p className="text-xs">{message.content}</p>
                        </div>
                      </div>
                    ) : message.type === "agent" ? (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="max-w-[80%]">
                          <div className="rounded-lg bg-muted p-2">
                            <p className="text-xs whitespace-pre-line">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      renderActionMessage(message)
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}
      </Card>
    );
  }

  // Floating variant (bottom-right)
  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-24 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 relative group"
          >
            <MessageSquare className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse"></span>
          </Button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl">
          <Card className="h-full flex flex-col border-2">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-500">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-white" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Kaisey</h3>
                  <p className="text-xs text-white/80">Your MBA Co-Pilot</p>
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

            <ScrollArea className="flex-1 p-4">
              {/* Messages rendering same as widget */}
            </ScrollArea>

            <div className="p-4 border-t">
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
                  className="bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}