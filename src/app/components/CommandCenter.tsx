import { Brain, Zap, Target, Clock } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { motion } from "motion/react";

export function CommandCenter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2">
        <div className="flex items-start gap-4">
          <motion.div 
            className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500"
            animate={{ 
              boxShadow: [
                "0 0 0 0 rgba(59, 130, 246, 0)",
                "0 0 0 8px rgba(59, 130, 246, 0.1)",
                "0 0 0 0 rgba(59, 130, 246, 0)",
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="w-6 h-6 text-white" />
          </motion.div>
        
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold">Nexus Executive Agent</h2>
              <Badge className="bg-green-500 text-white">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Active
                </motion.div>
              </Badge>
            </div>
          
            <p className="text-sm text-muted-foreground mb-4">
              Your AI Chief of Staff • Optimizing for Academic Excellence, Professional Networking & Well-being
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Today's ROI</div>
                  <div className="text-sm font-semibold">87% Optimized</div>
                </div>
              </div>
            
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Time Saved</div>
                  <div className="text-sm font-semibold">2.3 hours</div>
                </div>
              </div>
            
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-pink-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Actions Taken</div>
                  <div className="text-sm font-semibold">8 auto-moves</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}