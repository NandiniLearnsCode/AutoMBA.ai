import { Calendar, CheckCircle2, Activity } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";

export function ProfileSection() {
  const userProfile = {
    name: "Star MBA Student",
    email: "student@gsb.columbia.edu",
    program: "MBA Class of 2026",
    semester: "Spring Semester",
    initials: "SM",
    integrations: {
      googleCalendar: true,
      canvas: true,
      appleHealth: true,
    },
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4 mb-6">
        <Avatar className="h-16 w-16 border-2 border-blue-500">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
            {userProfile.initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="text-xl font-bold">{userProfile.name}</h2>
          <p className="text-sm text-muted-foreground">{userProfile.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{userProfile.program}</Badge>
            <Badge variant="outline" className="text-xs">{userProfile.semester}</Badge>
          </div>
        </div>
      </div>

      {/* Integration Status */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Connected Services</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Google Calendar</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center">
                <Calendar className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm">Canvas (Classes & Assignments)</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" />
              <span className="text-sm">Apple Health</span>
            </div>
            <Badge className="bg-green-500 text-white text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
