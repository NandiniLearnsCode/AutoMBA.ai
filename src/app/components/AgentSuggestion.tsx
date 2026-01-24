import { Brain, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { motion } from "motion/react";

interface AgentSuggestionProps {
  type: "conflict" | "optimization" | "alert" | "success";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismiss?: () => void;
}

export function AgentSuggestion({ type, title, description, action, dismiss }: AgentSuggestionProps) {
  const icons = {
    conflict: AlertCircle,
    optimization: TrendingUp,
    alert: Clock,
    success: CheckCircle,
  };

  const colors = {
    conflict: "border-orange-500 bg-orange-50", // Type A: Warning (orange)
    optimization: "border-blue-500 bg-blue-50", // Type B: Info (blue)
    alert: "border-orange-500 bg-orange-50", // Also orange for warnings
    success: "border-green-500/30 bg-green-500/5",
  };

  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-2 ${colors[type]} p-4 mb-3 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl"></div>
        <div className="relative flex gap-3">
          <div className="mt-0.5">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold mb-1 text-sm">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            {action && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={action.onClick}>
                  {action.label}
                </Button>
                {dismiss && (
                  <Button size="sm" variant="outline" onClick={dismiss}>
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}