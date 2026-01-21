import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { BookOpen, Users, Briefcase, Heart, TrendingUp } from "lucide-react";

interface DayOverview {
  day: string;
  date: string;
  metrics: {
    classes: number;
    networking: number;
    recruiting: number;
    wellness: number;
  };
  load: "light" | "moderate" | "heavy";
  highlight?: string;
}

const weekData: DayOverview[] = [
  {
    day: "Mon",
    date: "Jan 19",
    metrics: { classes: 3, networking: 2, recruiting: 1, wellness: 1 },
    load: "heavy",
  },
  {
    day: "Tue",
    date: "Jan 20",
    metrics: { classes: 2, networking: 1, recruiting: 2, wellness: 1 },
    load: "heavy",
    highlight: "Today",
  },
  {
    day: "Wed",
    date: "Jan 21",
    metrics: { classes: 2, networking: 3, recruiting: 0, wellness: 1 },
    load: "moderate",
  },
  {
    day: "Thu",
    date: "Jan 22",
    metrics: { classes: 3, networking: 1, recruiting: 1, wellness: 1 },
    load: "heavy",
    highlight: "Finance Case Due",
  },
  {
    day: "Fri",
    date: "Jan 23",
    metrics: { classes: 1, networking: 2, recruiting: 1, wellness: 2 },
    load: "light",
  },
];

export function WeeklyStrategy() {
  const loadColors = {
    light: "bg-green-500/20 text-green-500",
    moderate: "bg-yellow-500/20 text-yellow-500",
    heavy: "bg-red-500/20 text-red-500",
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Weekly Strategy View</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>Bandwidth Analysis</span>
        </div>
      </div>

      <div className="space-y-3">
        {weekData.map((day) => (
          <div
            key={day.day}
            className={`rounded-lg border p-3 ${
              day.highlight === "Today" ? "border-blue-500 bg-blue-500/5" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-sm">{day.day}</div>
                <div className="text-xs text-muted-foreground">{day.date}</div>
              </div>
              <Badge className={`text-xs ${loadColors[day.load]}`}>
                {day.load}
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center p-2 rounded bg-muted/50">
                <BookOpen className="w-4 h-4 mb-1 text-blue-500" />
                <span className="text-xs font-semibold">{day.metrics.classes}</span>
                <span className="text-xs text-muted-foreground">Class</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-muted/50">
                <Users className="w-4 h-4 mb-1 text-orange-500" />
                <span className="text-xs font-semibold">{day.metrics.networking}</span>
                <span className="text-xs text-muted-foreground">Network</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-muted/50">
                <Briefcase className="w-4 h-4 mb-1 text-red-500" />
                <span className="text-xs font-semibold">{day.metrics.recruiting}</span>
                <span className="text-xs text-muted-foreground">Recruit</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-muted/50">
                <Heart className="w-4 h-4 mb-1 text-green-500" />
                <span className="text-xs font-semibold">{day.metrics.wellness}</span>
                <span className="text-xs text-muted-foreground">Wellness</span>
              </div>
            </div>

            {day.highlight && day.highlight !== "Today" && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-orange-500">⚡</span>
                {day.highlight}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
