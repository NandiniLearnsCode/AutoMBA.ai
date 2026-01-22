import { Clock, Users, BookOpen, Dumbbell, Coffee, Briefcase, GraduationCap } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";

interface TimeBlock {
  id: string;
  time: string;
  duration: number;
  title: string;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer";
  status: "completed" | "current" | "upcoming" | "suggested";
  location?: string;
  priority: "hard-block" | "flexible" | "optional";
}

const timeBlocks: TimeBlock[] = [
  {
    id: "1",
    time: "08:00",
    duration: 90,
    title: "Corporate Finance",
    type: "class",
    status: "completed",
    location: "Room 304",
    priority: "hard-block",
  },
  {
    id: "2",
    time: "10:00",
    duration: 15,
    title: "Buffer / Travel",
    type: "buffer",
    status: "completed",
    priority: "optional",
  },
  {
    id: "3",
    time: "10:15",
    duration: 45,
    title: "Coffee Chat: Sarah Chen (McKinsey)",
    type: "networking",
    status: "current",
    location: "Starbucks",
    priority: "hard-block",
  },
  {
    id: "4",
    time: "11:00",
    duration: 60,
    title: "Strategy Canvas Quiz",
    type: "class",
    status: "upcoming",
    priority: "hard-block",
  },
  {
    id: "5",
    time: "12:00",
    duration: 60,
    title: "Goldman Sachs Info Session",
    type: "recruiting",
    status: "upcoming",
    location: "Online",
    priority: "hard-block",
  },
  {
    id: "6",
    time: "13:00",
    duration: 45,
    title: "Gym Session (Moved by Agent)",
    type: "workout",
    status: "suggested",
    location: "Campus Gym",
    priority: "flexible",
  },
];

const typeConfig = {
  class: { icon: GraduationCap, color: "bg-blue-500" },
  meeting: { icon: Users, color: "bg-purple-500" },
  study: { icon: BookOpen, color: "bg-indigo-500" },
  workout: { icon: Dumbbell, color: "bg-green-500" },
  networking: { icon: Coffee, color: "bg-orange-500" },
  recruiting: { icon: Briefcase, color: "bg-red-500" },
  buffer: { icon: Clock, color: "bg-gray-400" },
};

export function TimelineView() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Today's Timeline</h3>
        <span className="text-xs text-muted-foreground">Tuesday, Jan 20, 2026</span>
      </div>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-border"></div>

        {timeBlocks.map((block, index) => {
          const config = typeConfig[block.type];
          const Icon = config.icon;
          const isLast = index === timeBlocks.length - 1;

          return (
            <div key={block.id} className={`relative flex gap-4 ${!isLast ? "mb-6" : ""}`}>
              {/* Time */}
              <div className="w-16 text-sm text-muted-foreground font-mono pt-1">{block.time}</div>

              {/* Icon */}
              <div className="relative z-10">
                <div
                  className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center ${
                    block.status === "current" ? "ring-4 ring-blue-500/20" : ""
                  } ${block.status === "completed" ? "opacity-50" : ""} ${
                    block.status === "suggested" ? "ring-2 ring-dashed ring-green-500/50" : ""
                  }`}
                >
                  <Icon className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div
                  className={`rounded-lg border p-3 ${
                    block.status === "current" ? "border-blue-500 bg-blue-500/5" : ""
                  } ${block.status === "completed" ? "opacity-50" : ""} ${
                    block.status === "suggested" ? "border-green-500 border-dashed bg-green-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{block.title}</h4>
                    <Badge
                      variant={block.priority === "hard-block" ? "default" : "outline"}
                      className="text-xs shrink-0"
                    >
                      {block.priority === "hard-block" ? "Critical" : block.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{block.duration} min</span>
                    {block.location && <span>• {block.location}</span>}
                    {block.status === "current" && (
                      <span className="text-blue-500 font-semibold">• In Progress</span>
                    )}
                    {block.status === "suggested" && (
                      <span className="text-green-500 font-semibold">• Agent Suggested</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
