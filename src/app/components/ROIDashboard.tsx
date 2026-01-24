import { TrendingUp, Target, Zap, Calendar } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const weeklyROIData = [
  { day: "Mon", roi: 72, optimization: 65 },
  { day: "Tue", roi: 87, optimization: 82 },
  { day: "Wed", roi: 75, optimization: 70 },
  { day: "Thu", roi: 92, optimization: 88 },
  { day: "Fri", roi: 85, optimization: 80 },
];

export function ROIDashboard() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Time ROI Analytics</h3>
        <span className="text-xs text-muted-foreground">This week</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Avg ROI</span>
          </div>
          <div className="text-2xl font-bold">82%</div>
          <div className="text-xs text-green-500 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +12% vs last week
          </div>
        </div>

        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Auto-moves</span>
          </div>
          <div className="text-2xl font-bold">34</div>
          <div className="text-xs text-muted-foreground mt-1">
            This week
          </div>
        </div>

        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Time saved</span>
          </div>
          <div className="text-2xl font-bold">8.2h</div>
          <div className="text-xs text-muted-foreground mt-1">
            This week
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyROIData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOptimization" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="roi"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRoi)"
            />
            <Area
              type="monotone"
              dataKey="optimization"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOptimization)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-muted-foreground">Time ROI</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-muted-foreground">Optimization Score</span>
        </div>
      </div>
    </Card>
  );
}
