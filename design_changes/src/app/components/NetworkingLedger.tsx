import { Building2, Calendar, Mail, Phone, MessageSquare } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";

interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  lastContact: string;
  nextAction: string;
  priority: "high" | "medium" | "low";
  status: "upcoming" | "follow-up" | "connected";
  highlights?: string[];
}

const contacts: Contact[] = [
  {
    id: "1",
    name: "Sarah Chen",
    company: "McKinsey & Company",
    role: "Senior Associate",
    lastContact: "Today, 10:15 AM",
    nextAction: "Send thank you note",
    priority: "high",
    status: "upcoming",
    highlights: [
      "Worked on PE deals in tech sector",
      "Stanford MBA '19",
      "Interested in mentoring",
    ],
  },
  {
    id: "2",
    name: "Michael Rodriguez",
    company: "Goldman Sachs",
    role: "VP, Investment Banking",
    lastContact: "Jan 18",
    nextAction: "Follow up post-info session",
    priority: "high",
    status: "follow-up",
    highlights: [
      "M&A focus in healthcare",
      "Mentioned summer internship opportunities",
    ],
  },
  {
    id: "3",
    name: "Emily Zhang",
    company: "Google",
    role: "Product Manager",
    lastContact: "Jan 15",
    nextAction: "Schedule second coffee chat",
    priority: "medium",
    status: "connected",
    highlights: [
      "Previously at Meta",
      "Can intro to APM team",
    ],
  },
];

export function NetworkingLedger() {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const statusColors = {
    upcoming: "bg-blue-500",
    "follow-up": "bg-orange-500",
    connected: "bg-green-500",
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Networking CRM</h3>
        <Badge variant="outline" className="text-xs">
          {contacts.filter((c) => c.status === "follow-up").length} Follow-ups
        </Badge>
      </div>

      <div className="space-y-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-lg border bg-card p-3">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="text-xs">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h4 className="font-semibold text-sm">{contact.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {contact.role} at {contact.company}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${statusColors[contact.status]} shrink-0 mt-1.5`}></div>
                </div>

                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Last: {contact.lastContact}
                </div>

                {contact.highlights && (
                  <div className="mb-2 space-y-1">
                    {contact.highlights.map((highlight, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-blue-500">•</span>
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {contact.nextAction}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Quick note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full mt-3" size="sm">
        View All Contacts
      </Button>
    </Card>
  );
}
