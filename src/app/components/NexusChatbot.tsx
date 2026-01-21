import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Brain, Check, Clock, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  type: "user" | "agent" | "action";
  content: string;
  timestamp: Date;
  action?: {
    type: "move" | "cancel" | "add" | "suggest";
    details: string;
    status: "pending" | "approved" | "rejected";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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

    // Pattern matching for different requests
    if (lowerInput.includes("move") || lowerInput.includes("reschedule")) {
      // Extract what to move and when
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
        content: `I can move your ${eventToMove} to ${newTime}. This adjustment considers your current HRV levels and creates optimal spacing for cognitive recovery.`,
        timestamp: new Date(),
        action: {
          type: "move",
          details: `Move ${eventToMove} to ${newTime}`,
          status: "pending",
        },
      });
    } else if (lowerInput.includes("cancel") || lowerInput.includes("remove")) {
      let eventToCancel = "optional events";
      
      if (lowerInput.includes("gym")) eventToCancel = "Gym Session";
      if (lowerInput.includes("all")) eventToCancel = "all optional events";
      if (lowerInput.includes("afternoon")) eventToCancel = "afternoon appointments";

      responses.push({
        id: (Date.now() + 1).toString(),
        type: "action",
        content: `I'll cancel ${eventToCancel}. This will free up time for recovery, which your biometrics indicate is needed.`,
        timestamp: new Date(),
        action: {
          type: "cancel",
          details: `Cancel ${eventToCancel}`,
          status: "pending",
        },
      });
    } else if (lowerInput.includes("add") || lowerInput.includes("schedule") || lowerInput.includes("block")) {
      let duration = "2 hours";
      let activity = "deep work";
      
      if (lowerInput.match(/\d+\s*hour/)) {
        const match = lowerInput.match(/(\d+)\s*hour/);
        if (match) duration = `${match[1]} hour${match[1] !== "1" ? "s" : ""}`;
      }
      
      if (lowerInput.includes("study")) activity = "focused study";
      if (lowerInput.includes("work")) activity = "deep work";
      if (lowerInput.includes("case")) activity = "case study prep";
      if (lowerInput.includes("network")) activity = "networking";

      responses.push({
        id: (Date.now() + 1).toString(),
        type: "action",
        content: `I recommend adding ${duration} of ${activity} tomorrow at 9:00 AM when your cognitive performance is typically highest. This aligns with your peak productivity windows.`,
        timestamp: new Date(),
        action: {
          type: "add",
          details: `Add ${duration} ${activity} block at 9:00 AM tomorrow`,
          status: "pending",
        },
      });
    } else if (lowerInput.includes("next") || lowerInput.includes("what's") || lowerInput.includes("when")) {
      responses.push({
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "Your next commitment is the Coffee Chat with Sarah Chen (McKinsey) at 10:15 AM at Starbucks. It's a hard-block event with 45 minutes allocated. After that, you have the Strategy Canvas Quiz at 11:00 AM.",
        timestamp: new Date(),
      });
    } else if (lowerInput.includes("optimize") || lowerInput.includes("improve") || lowerInput.includes("suggest")) {
      responses.push({
        id: (Date.now() + 1).toString(),
        type: "action",
        content: "Based on your biometrics (5.2h sleep, elevated HRV), I recommend moving the Valuation Case Study to tomorrow morning when your cognitive function peaks. This will improve output quality by approximately 34% based on your historical patterns.",
        timestamp: new Date(),
        action: {
          type: "suggest",
          details: "Move Valuation Case Study to tomorrow 9:00 AM",
          status: "pending",
        },
      });
    } else if (lowerInput.includes("clear") || lowerInput.includes("free up")) {
      let timeframe = "afternoon";
      if (lowerInput.includes("morning")) timeframe = "morning";
      if (lowerInput.includes("tomorrow")) timeframe = "tomorrow";

      responses.push({
        id: (Date.now() + 1).toString(),
        type: "action",
        content: `I can clear your ${timeframe} by moving 2 flexible events and canceling 1 optional buffer. This creates a 3-hour block for high-impact work. Shall I proceed?`,
        timestamp: new Date(),
        action: {
          type: "move",
          details: `Clear ${timeframe} schedule`,
          status: "pending",
        },
      });
    } else if (lowerInput.includes("health") || lowerInput.includes("recovery") || lowerInput.includes("biometric")) {
      responses.push({
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "Your current biometrics show: HRV at 42ms (low), 5.2 hours sleep (suboptimal), and stress levels elevated. I recommend scheduling active recovery this afternoon and targeting 8+ hours sleep tonight. Your next high-stakes event (Goldman Sachs Info Session) would benefit from better rest beforehand.",
        timestamp: new Date(),
      });
    } else if (lowerInput.includes("conflict")) {
      responses.push({
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "I've detected 1 schedule conflict: Goldman Sachs Info Session overlaps with your gym session at 12:00 PM. Given your low HRV, I recommend moving the gym session to 1:00 PM for active recovery instead of intense training.",
        timestamp: new Date(),
      });
    } else {
      // Default response
      responses.push({
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "I can help you with:\n• Moving or rescheduling events\n• Canceling appointments\n• Adding study/work blocks\n• Optimizing based on biometrics\n• Resolving conflicts\n• Clearing time for deep work\n\nWhat would you like me to do?",
        timestamp: new Date(),
      });
    }

    return responses;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    setIsTyping(true);
    const newMessages = processUserRequest(inputValue);
    
    // Add user message immediately
    setMessages((prev) => [...prev, newMessages[0]]);
    setInputValue("");

    // Simulate agent thinking time
    setTimeout(() => {
      setMessages((prev) => [...prev, ...newMessages.slice(1)]);
      setIsTyping(false);
    }, 800);
  };

  const handleApproveAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.action
          ? { ...msg, action: { ...msg.action, status: "approved" as const } }
          : msg
      )
    );

    const message = messages.find((m) => m.id === messageId);
    if (message?.action && onScheduleChange) {
      onScheduleChange(message.action.type, message.action.details);
    }

    // Add confirmation message
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
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
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