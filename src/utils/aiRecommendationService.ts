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

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    const dayOfWeek = format(today, "EEEE");
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    
    const systemPrompt = `You are Kaisey, an AI assistant helping MBA students optimize their schedules.

**Current Context:**
- Today is ${todayStr} (${dayOfWeek})
- Current time: ${currentTime}
- ${isWeekend ? 'Weekend - focus on rest, wellness, and catch-up work' : 'Weekday - prioritize classes, networking, and assignments'}

**Today's Schedule:**
${eventsContext || "No events scheduled"}

**Assignments:**
${assignmentsContext}

**Your Task:**
Analyze the schedule and generate 2-5 actionable recommendations. Be contextually aware:
- If it's morning, suggest optimizations for the day ahead
- If it's afternoon, focus on remaining time and evening prep
- If it's evening, suggest tomorrow's prep or rest opportunities
- Consider time of day for optimal scheduling (e.g., study blocks, workouts)

**Recommendation Types (prioritize these):**
1. **BUFFER** - Events back-to-back with <15min gap (suggest adding buffer time or shifting)
2. **URGENCY** - Assignments due within 48h with <50% completion (suggest study blocks)
3. **SHIFT** - Non-critical events that could move to create better flow (suggest new time)
4. **OPTIMIZATION** - Opportunities to add wellness, study, or networking time
5. **ALERT** - Critical conflicts or missed opportunities

**For each recommendation, provide:**
- Specific event names and times
- Clear reasoning based on current context
- Actionable steps (add buffer, move event, schedule study time, etc.)

**Response Format (JSON array):**
[
  {
    "type": "buffer" | "urgency" | "shift" | "optimization" | "alert",
    "title": "Short, actionable title (max 50 chars)",
    "description": "Clear explanation with specific times, event names, and why this helps (2-3 sentences). Reference current time context.",
    "action": {
      "type": "add" | "move" | "delete" | "reschedule",
      "eventId": "event-id-if-moving/deleting",
      "eventTitle": "Event name if moving/deleting",
      "newTime": "HH:MM format if rescheduling (24-hour format)",
      "duration": minutes if adding,
      "title": "Event title if adding"
    },
    "priority": "high" | "medium" | "low"
  }
]

Be specific with times, event names, and actions. Reference the current time and day context. Return ONLY valid JSON array, no other text.`;

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
            content: `Generate contextually-aware recommendations for ${todayStr} at ${currentTime}. Analyze the schedule and provide specific, actionable suggestions for optimizing, adding, or adjusting events. Consider the time of day and what makes sense for right now.`,
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
