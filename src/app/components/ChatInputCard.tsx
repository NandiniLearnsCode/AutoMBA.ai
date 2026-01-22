import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { MessageSquare, Send, X, Brain, Check, Clock, Calendar, Sparkles, ChevronDown, ChevronUp, RefreshCw, ExternalLink } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { motion } from "motion/react";
import { getToday } from "@/utils/dateUtils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import ReactMarkdown from "react-markdown";
import { ChatAction } from "./ChatAction";

interface ChatInputCardProps {
  onScheduleChange?: (action: string, details: any) => void;
  onSendMessage?: (message: string) => void;
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
    userRequest?: string;
  };
}

/**
 * Expandable chat input card - expands to show full chat interface
 * Integrates with NexusChatbot logic via global window object
 */
export const ChatInputCard = forwardRef<{ focus: () => void }, ChatInputCardProps>(
  ({ onSendMessage }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [calendarLoaded, setCalendarLoaded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Sync messages from NexusChatbot
    useEffect(() => {
      const syncMessages = () => {
        if ((window as any).__nexusChatbotMessages) {
          setMessages((window as any).__nexusChatbotMessages);
        }
        if ((window as any).__nexusChatbotIsTyping !== undefined) {
          setIsTyping((window as any).__nexusChatbotIsTyping);
        }
      };

      syncMessages();
      const interval = setInterval(syncMessages, 100); // Sync every 100ms
      return () => clearInterval(interval);
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, [messages, isTyping]);

    // Load calendar and generate suggestions when expanded
    useEffect(() => {
      if (isExpanded && !calendarLoaded && (window as any).__nexusChatbotLoadCalendar) {
        const loadCalendar = async () => {
          try {
            const today = getToday();
            
            // Load day, week, and month
            const dayStart = startOfDay(today);
            const dayEnd = endOfDay(today);
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
            const monthStart = startOfMonth(today);
            const monthEnd = endOfMonth(today);

            await Promise.all([
              (window as any).__nexusChatbotLoadCalendar({ startDate: dayStart, endDate: dayEnd }),
              (window as any).__nexusChatbotLoadCalendar({ startDate: weekStart, endDate: weekEnd }),
              (window as any).__nexusChatbotLoadCalendar({ startDate: monthStart, endDate: monthEnd }),
            ]);

            setCalendarLoaded(true);
            
            // Generate and show proactive recommendations when chat opens
            if ((window as any).__nexusChatbotGenerateProactiveRecommendations) {
              (window as any).__nexusChatbotGenerateProactiveRecommendations();
            }
          } catch (error) {
            console.error("Error loading calendar:", error);
          }
        };

        loadCalendar();
      }
    }, [isExpanded, calendarLoaded]);

    const handleSubmit = () => {
      if (!inputValue.trim()) return;
      
      const message = inputValue.trim();
      setInputValue("");
      
      // Call chatbot's send handler
      if ((window as any).__nexusChatbotSendMessage) {
        (window as any).__nexusChatbotSendMessage(message);
      }
      
      // Also call parent's handler if provided
      if (onSendMessage) {
        onSendMessage(message);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    const handleRefresh = async () => {
      if ((window as any).__nexusChatbotRefresh) {
        await (window as any).__nexusChatbotRefresh();
        setCalendarLoaded(false);
      }
    };

    const handleApproveAction = (messageId: string) => {
      if ((window as any).__nexusChatbotHandleApprove) {
        (window as any).__nexusChatbotHandleApprove(messageId);
      }
    };

    const handleRejectAction = (messageId: string) => {
      if ((window as any).__nexusChatbotHandleReject) {
        (window as any).__nexusChatbotHandleReject(messageId);
      }
    };

    return (
      <Card className="rounded-2xl shadow-lg border-0 bg-white/95 backdrop-blur-xl overflow-hidden">
        {!isExpanded ? (
          // Collapsed state - just input
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">Chat with Kaisey</h3>
                <p className="text-xs text-gray-600 font-medium">
                  Tell me your priority and I'll optimize your schedule
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 'Schedule time for valuation case study today'"
                className="flex-1 border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded-xl"
              />
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all rounded-xl px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Expanded state - full chat interface
          <div className="flex flex-col" style={{ height: "600px" }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-lg border border-white/30">
                  <Brain className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight">Kaisey Chat</h3>
                  <p className="text-xs text-white/90 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shadow-sm shadow-emerald-400"></span>
                    {calendarLoaded ? "Calendar Loaded" : "Loading Calendar..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-9 w-9 p-0 text-white hover:bg-white/25 rounded-lg transition-colors"
                  title="Refresh Chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-9 w-9 p-0 text-white hover:bg-white/25 rounded-lg transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
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
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 border-2 border-white">
                          <Sparkles className="w-5 h-5 text-white" />
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
                  </motion.div>
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
            <div className="p-4 border-t bg-white/80 backdrop-blur-sm border-gray-200">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me to adjust your schedule..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2.5 font-light">
                Try: "Move gym to 2pm" or "Clear my afternoon"
              </p>
            </div>
          </div>
        )}
      </Card>
    );
  }
);

ChatInputCard.displayName = "ChatInputCard";
