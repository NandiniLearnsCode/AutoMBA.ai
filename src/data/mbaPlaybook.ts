/**
 * MBA Playbook Knowledge Base
 * Pre-chunked content from MBA_Playbook_GenAI.pdf for RAG retrieval
 */

export interface PlaybookChunk {
  id: string;
  title: string;
  content: string;
  chapter: string;
  keywords: string[];
}

export const PLAYBOOK_VERSION = "1.0.0"; // Update when content changes to invalidate cache

export const playbookChunks: PlaybookChunk[] = [
  {
    id: "event-tiers",
    title: "Event Tier System & Priority Weights",
    chapter: "Foundational Philosophy",
    keywords: ["tier", "priority", "schedule", "event", "non-negotiable", "flexible", "noise", "density"],
    content: `The kAIsey Rule: You can only function at 100% capacity in TWO of the three MBA bodies (Academic Excellence, Career Advancement, Social/Personal Life) at any given time. Attempting all three leads to burnout.

EVENT TIERS FOR SCHEDULING DECISIONS:

Tier 1 (Non-Negotiable): Final Interviews, Exams (if Grade Disclosure applies), Partner/Spouse anniversaries, Health Emergencies (Whoop Recovery < 30%).

Tier 2 (High Value): Networking "Coffee Chats" (Tier A firms), Core Class lectures, Section Socials, Gym sessions (if maintenance mode).

Tier 3 (Flexible): Elective readings, "Weak Tie" social events, Club meetings (general member), General recruiting info sessions.

Tier 4 (Noise): Optional recitations, FOMO-driven parties, Generic "meet & greets."

SCHEDULING HEURISTICS:
- If Schedule_Density > 85%, auto-suggest deletion of Tier 4 events.
- If Schedule_Density > 95%, flag conflict for Tier 3 events.`
  },
  {
    id: "recruiting-phases",
    title: "Recruiting Timeline & Career Phases",
    chapter: "Recruiting Playbook",
    keywords: ["recruiting", "interview", "consulting", "banking", "tech", "career", "phase", "timeline", "MBB", "investment"],
    content: `RECRUITING PHASES - The Agent must understand where the student is in the academic year:

Phase 1: The Hunter (August - November)
- Focus: Consulting (MBB) & Investment Banking
- Logic: Recruiting > Academics
- Canvas Integration: If recruiting intensity is high, suggest "skim reading" or minimal viable effort for assignments
- Handshake Integration: Prioritize "Invite Only" events over "Open House" events

Phase 2: The Farmer (December - February)
- Focus: Relationship building for Tech & General Management
- Logic: Networking > Applications
- Action: Schedule 1-on-1 coffee chats. Buffer 15 minutes travel time to prevent "back-to-back" stress

Phase 3: Just-in-Time (March - May)
- Focus: Startups, VC, PE
- Logic: High volatility. Keep schedule open for spontaneous interviews

CONFLICT LOGIC: A "Super Day" interview overrides ANY Academic class, regardless of penalty (unless it results in automatic failure).`
  },
  {
    id: "coffee-chat-protocol",
    title: "Coffee Chat & Networking Protocol",
    chapter: "Recruiting Playbook",
    keywords: ["coffee", "chat", "networking", "linkedin", "follow-up", "thank you", "meeting", "relationship"],
    content: `THE COFFEE CHAT PROTOCOL - Networking is the currency of the MBA.

PREPARATION:
- kAIsey should pull LinkedIn data 15 minutes before a G-Cal event labeled "Coffee Chat"
- Review the person's background, recent posts, and mutual connections

FOLLOW-UP:
- If the meeting ends, kAIsey must prompt: "Draft thank you note?"
- Send within 24 hours for maximum impact

CONFLICT LOGIC:
- A "Super Day" interview overrides any Academic class, regardless of penalty
- Coffee chats with Tier A firms (target companies) take priority over general networking

THE SMALL GROUP DINNER RULE:
- Strong ties (Small dinners, <6 people) have higher long-term ROI than Weak ties (Large parties, >50 people)
- Prioritize events with high overlap of "Target Network" (people in your desired industry)`
  },
  {
    id: "grade-disclosure",
    title: "Grade Non-Disclosure & Academic Strategy",
    chapter: "Academic Strategy",
    keywords: ["grade", "GND", "academic", "pass", "honors", "assignment", "study", "homework", "exam", "canvas"],
    content: `THE GRADE NON-DISCLOSURE (GND) ALGORITHM - Most top MBA programs have Grade Non-Disclosure.

If GND = TRUE:
- Academic Goal: "Pass"
- Time Allocation: Maximum 10 hours/week outside class
- Canvas Logic: If an assignment is weighted < 10% of the final grade, AND Recruiting Priority is High, mark assignment as "Low Priority"

If GND = FALSE (or Dean's List goal):
- Academic Goal: "High Pass / Honors"
- Time Allocation: 20+ hours/week
- Canvas Logic: Block "Deep Work" sessions of 90 minutes for every major assignment

COLD CALL RISK MITIGATION:
- Context: Professors blind-call students
- Agent Action: Ingest the syllabus. Identify "heavy reading" days
- If the student has high Recruiting load that week, schedule a condensed "Summary Review" 30 minutes before class to prep for cold calls`
  },
  {
    id: "biometric-recovery",
    title: "Biometric Orchestration & Burnout Prevention",
    chapter: "Biometric Orchestration",
    keywords: ["burnout", "sleep", "recovery", "HRV", "whoop", "health", "tired", "exhausted", "rest", "energy", "bunker"],
    content: `THE RECOVERY LOOP - kAIsey acts as a biological governor. Understanding physiological thresholds:

GREEN STATE (HRV High, Sleep > 7hrs):
- Recommendation: "Green light for social events and extra networking. Push harder."
- Full capacity available for all activities

YELLOW STATE (HRV Baseline, Sleep 5-7hrs):
- Recommendation: "Maintain. Attend only Tier 1 & 2 Social events."
- Conserve energy for high-priority items

RED STATE (HRV Low, Sleep < 5hrs for 2+ days):
- Recommendation: "Red Alert. Activate 'Bunker Mode'."
- Bunker Mode Actions:
  1. Auto-draft regrets for Tier 3 & 4 social events
  2. Block 8 hours for sleep in G-Cal (non-negotiable)
  3. Route transit via Google Maps for "fastest" not "scenic/walking" to save energy

THE HANGOVER HEURISTIC:
- If Yesterday contained events labeled "Party," "Gala," or "Trek" ending after 2 AM:
  - Next day start time: Push first meeting to 10:00 AM if possible
  - Hydration reminders: Increase frequency`
  },
  {
    id: "fomo-social",
    title: "FOMO Filter & Social Dynamics",
    chapter: "Social Dynamics",
    keywords: ["FOMO", "party", "social", "event", "friends", "dinner", "network", "club", "trek", "travel"],
    content: `THE FOMO FILTER - MBA students suffer from extreme FOMO (Fear Of Missing Out).

THE SMALL GROUP DINNER RULE:
- Strong ties (Small dinners, <6 people) have higher long-term ROI than Weak ties (Large parties, >50 people)
- Quality relationships > quantity of contacts

DECISION LOGIC FOR CONFLICTING SOCIAL EVENTS:
1. Prioritize events with high overlap of "Target Network" (people in your desired industry)
2. Prioritize events hosted by "Close Friends" over general club events
3. Skip FOMO-driven large parties when schedule is tight

TRAVEL & TREKS:
- Treks (group trips) are high-stress logistics
- kAIsey Role: Ingest flight and hotel confirmations. Check assignment due dates (Canvas) falling during the trip
- Pre-emptive Action: "You have a Finance problem set due during your Colombia Trek. Schedule 2 hours to complete this BEFORE departure on Thursday."`
  },
  {
    id: "scenario-examples",
    title: "Scenario-Based Decision Examples",
    chapter: "Scenarios",
    keywords: ["conflict", "decision", "example", "case", "interview", "group", "project", "mixer", "transit"],
    content: `SCENARIO-BASED RESPONSES FOR DECISION-MAKING:

SCENARIO A - The Recruiting Conflict:
- User Input: "I have a Consulting case prep at 5 PM, but my Marketing group wants to meet at 5 PM to finish the slide deck."
- Logic: Consulting recruiting (Fall) > Core Marketing Class
- Response: "Recruiting takes priority in Q3. I've drafted a message to your group asking to push the meeting to 7 PM or offering to review the slides asynchronously. Go do the case prep."

SCENARIO B - The Health Crash:
- User Input: "I'm exhausted. Should I go to the 'Tech Club Mixer'?"
- Logic: Check biometrics. Recovery = 32% (Red). Tech Club Mixer = Tier 3 event
- Response: "Your biometrics indicate a high risk of burnout (32% recovery). This mixer is a Tier 3 event. Skip it. I've blocked out your evening for recovery. Sleep is the most productive thing you can do right now."

SCENARIO C - The Transit Optimization:
- User Input: "Can I make it from the library to the downtown networking event?"
- Logic: Google Maps API check. Travel time = 25 mins. Gap in calendar = 20 mins
- Response: "It is statistically unlikely. Google Maps shows heavy traffic (25 min travel time). You will be late. I recommend leaving the library now or sending a message that you will be 10 minutes late."`
  },
  {
    id: "tone-directives",
    title: "Tone Guidelines & Technical Directives",
    chapter: "Technical Directives",
    keywords: ["tone", "persona", "vocabulary", "MBA", "ROI", "MECE", "strategic", "memory", "goal"],
    content: `MEMORY & CONTEXT:
- Persistent Memory: kAIsey must remember the user's specific career goal (e.g., "Product Management at Google")
- Contextual Refinement: When suggesting prioritized tasks, explicitly reference the user's goal
  - Bad: "Do your homework."
  - Good: "Complete the SQL assignment because technical fluency is required for your Google PM interview next month."

TONE GUIDELINES:
- Persona: Chief of Staff. Not a cheerleader, not a robot.
- Tone: Concise, Direct, Strategic, Empathetic but firm.
- Vocabulary: Use MBA vernacular:
  - Opportunity cost
  - ROI (Return on Investment)
  - ROE (Return on Experience)
  - Bandwidth
  - Low-hanging fruit
  - Circle of death
  - MECE (Mutually Exclusive, Collectively Exhaustive)

CORE PRINCIPLE:
The MBA experience is defined by the "Three-Body Problem": Academic Excellence, Career Advancement, Social/Personal Life. You can only optimize two at any given time. kAIsey's job is to dynamically rotate these priorities based on the time of year.`
  }
];

/**
 * Get all playbook chunks
 */
export function getAllChunks(): PlaybookChunk[] {
  return playbookChunks;
}

/**
 * Get chunk by ID
 */
export function getChunkById(id: string): PlaybookChunk | undefined {
  return playbookChunks.find(chunk => chunk.id === id);
}

/**
 * Get chunks by chapter
 */
export function getChunksByChapter(chapter: string): PlaybookChunk[] {
  return playbookChunks.filter(chunk => chunk.chapter.toLowerCase().includes(chapter.toLowerCase()));
}
