import { getOpenAIApiKey } from "@/config/apiKey";
import { getToday } from "./dateUtils";
import { startOfDay, endOfDay, format } from "date-fns";

export interface AIRecommendation {
  id: string;
  type: "buffer" | "urgency" | "shift" | "optimization" | "alert";
  title: string;
  description: string;
  action: {
    type: "add" | "move" | "delete" | "reschedule";
    eventId?: string;
    eventTitle?: string;
    newTime?: string;
    duration?: number;
    title?: string;
  };
  priority: "high" | "medium" | "low";
}

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: number;
  type: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Generate AI-powered recommendations based on today's calendar
 */
export async function generateAIRecommendations(
  events: CalendarEvent[],
  assignments?: Array<{
    id: string;
    title: string;
    course: string;
    dueDate: string;
    priority: string;
    progress: number;
  }>
): Promise<AIRecommendation[]> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    console.warn("OpenAI API key not found, returning empty recommendations");
    return [];
  }

  try {
    const today = getToday();
    const todayStr = format(today, "EEEE, MMMM d, yyyy");
    
    // Format events for AI context
    const eventsContext = events
      .map((e) => `- ${e.title} (${e.time}, ${e.duration}min, ${e.type})`)
      .join("\n");

    const assignmentsContext = assignments
      ? assignments
          .map(
            (a) =>
              `- ${a.title} (${a.course}): Due ${a.dueDate}, ${a.progress}% complete, Priority: ${a.priority}`
          )
          .join("\n")
      : "No assignments data available";

    const systemPrompt = `You are Kaisey, an AI assistant helping MBA students optimize their schedules.

Analyze the user's calendar for ${todayStr} and generate 2-4 actionable recommendations to improve their schedule.

**Today's Schedule:**
${eventsContext || "No events scheduled"}

**Assignments:**
${assignmentsContext}

**Recommendation Guidelines:**
1. Identify tight schedules (events back-to-back with no buffer)
2. Find opportunities to add study time for urgent assignments
3. Suggest moving non-critical events to create better flow
4. Recommend deleting or rescheduling low-priority conflicts
5. Prioritize based on: academic deadlines, networking opportunities, wellness needs

**Response Format (JSON array):**
[
  {
    "type": "buffer" | "urgency" | "shift" | "optimization" | "alert",
    "title": "Short, actionable title (max 50 chars)",
    "description": "Clear explanation with specific times and event names (2-3 sentences)",
    "action": {
      "type": "add" | "move" | "delete" | "reschedule",
      "eventId": "event-id-if-moving/deleting",
      "eventTitle": "Event name if moving/deleting",
      "newTime": "HH:MM format if rescheduling",
      "duration": minutes if adding,
      "title": "Event title if adding"
    },
    "priority": "high" | "medium" | "low"
  }
]

Be specific with times, event names, and actions. Return ONLY valid JSON array, no other text.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate recommendations for ${todayStr}. Focus on actionable improvements.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "[]";

    // Parse JSON response
    let recommendations: AIRecommendation[] = [];
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed)) {
        recommendations = parsed.map((rec, index) => ({
          id: `ai-rec-${Date.now()}-${index}`,
          ...rec,
        }));
      }
    } catch (parseError) {
      console.error("Error parsing AI recommendations:", parseError);
      console.error("Raw response:", content);
    }

    return recommendations;
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    return [];
  }
}
