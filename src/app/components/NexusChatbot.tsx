import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Brain, Check, Clock, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { getOpenAIApiKey } from "@/config/apiKey";

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

  const callOpenAI = async (userMessage: string, conversationHistory: Array<{role: string, content: string}>): Promise<string> => {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.");
    }

    const systemPrompt = `You are the Nexus Executive Agent, an AI assistant helping MBA students optimize their schedule to maximize the Triple Bottom Line: Academic Excellence, Professional Networking, and Personal Well-being.

Your role is to:
- Help users optimize their schedule, manage conflicts, and make adjustments
- Provide context-aware suggestions based on their needs
- Be concise, professional, and action-oriented
- When suggesting actions (moving, canceling, adding events), format your response clearly so the user understands what action you're proposing

Respond naturally and helpfully to the user's questions and requests.`;

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

      // Call OpenAI API
      const aiResponse = await callOpenAI(userInput, conversationHistory);

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