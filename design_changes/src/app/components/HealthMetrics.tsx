import { Activity, Heart, Moon, TrendingUp, Zap, Smartphone, Watch } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress: number;
  status: "good" | "warning" | "critical";
  subtext?: string;
}

function MetricCard({ icon, label, value, progress, status, subtext }: MetricCardProps) {
  const statusColors = {
    good: "text-green-500",
    warning: "text-yellow-500",
    critical: "text-red-500",
  };

  const progressColors = {
    good: "bg-green-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
  };

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`${statusColors[status]}`}>{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mb-2">{subtext}</div>}
      <div className="relative">
        <Progress value={progress} className="h-1.5" />
        <div
          className={`absolute top-0 left-0 h-1.5 rounded-full ${progressColors[status]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function HealthMetrics() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Biometric Status</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            Apple Health
          </Badge>
          <span className="text-xs text-muted-foreground">2 min ago</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Moon className="w-4 h-4" />}
          label="Sleep"
          value="5.2h"
          progress={65}
          status="warning"
          subtext="Target: 7h"
        />
        <MetricCard
          icon={<Heart className="w-4 h-4" />}
          label="HRV"
          value="42 ms"
          progress={45}
          status="critical"
          subtext="Recovery: Low"
        />
        <MetricCard
          icon={<Zap className="w-4 h-4" />}
          label="Strain"
          value="14.2"
          progress={71}
          status="warning"
          subtext="High load"
        />
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="Activity"
          value="5.1 mi"
          progress={85}
          status="good"
          subtext="Morning run"
        />
      </div>
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-yellow-500/20">
        <div className="flex gap-2 items-start">
          <TrendingUp className="w-4 h-4 text-yellow-500 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold">Kaisey Recommendation:</span> Low recovery detected. Consider rescheduling non-critical tasks.
          </div>
        </div>
      </div>
    </Card>
  );
}