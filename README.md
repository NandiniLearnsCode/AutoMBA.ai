# AutoMBA.ai (Kaisey)

**Your AI-powered Chief of Staff for MBA life.**

AutoMBA.ai helps overwhelmed MBA students optimize their schedules based on their personal priorities. Meet **Kaisey** - an intelligent assistant that understands the unique challenges of balancing academics, recruiting, social life, and wellness during your MBA journey.

## Live Demo

**Try it now:** [https://automba-ai-qqyo.onrender.com/](https://automba-ai-qqyo.onrender.com/)

> **Note:** The current version displays a sample calendar for the demo user `bettermba2@gmail.com`. Future versions will support Google OAuth login, allowing any user to connect their own Google Calendar.

---

## What is Kaisey?

Kaisey is an AI assistant designed specifically for MBA students. Unlike generic scheduling tools, Kaisey understands:

- **The MBA "Three-Body Problem"**: You can only optimize two of three areas (Academics, Career, Social) at any time
- **Recruiting Timelines**: Different priorities for consulting season (Aug-Nov), tech recruiting (Dec-Feb), and startup/VC (Mar-May)
- **Event Tiers**: Not all events are equal - final interviews trump club mixers
- **Burnout Prevention**: When you're exhausted, Kaisey tells you to skip that Tier 3 party and sleep

---

## Key Features

### 1. Smart Calendar Management
- View your weekly schedule in an intuitive timeline
- Add, move, or delete events through natural conversation
- Automatic conflict detection with suggested alternative times

### 2. AI-Powered Recommendations
- Get personalized suggestions based on your priorities
- Buffer time recommendations between back-to-back meetings
- Urgency alerts for assignments due soon

### 3. Priority-Based Decision Making
- Drag-and-drop to rank your priorities (Recruiting, Socials, Sleep, Clubs, Homework)
- All recommendations adapt to YOUR priority order
- The AI frames advice around what matters most to you

### 4. Natural Language Chat
- Talk to Kaisey like a real assistant: *"Add dinner with John at 7pm tomorrow"*
- Ask questions: *"What do I have this week?"*
- Get advice: *"Should I go to the tech mixer tonight?"*

---

## How to Use the Website

### Getting Started

1. **Visit** [https://automba-ai-qqyo.onrender.com/](https://automba-ai-qqyo.onrender.com/)
2. **Enter your OpenAI API key** in the Settings panel (gear icon in the top right)
   - Your API key is stored locally in your browser and never sent to our servers
3. **Explore the demo calendar** showing sample events

### The Main Interface

The interface has three main sections:

#### Left Panel - Command Center
- **Calendar**: Click dates to view events for that day
- **Priorities**: Drag to reorder what matters most to you
- **Health Metrics**: (Coming soon) Integration with wellness data

#### Center Panel - Timeline View
- See your weekly schedule at a glance
- Events are color-coded by type (classes, meetings, workouts, etc.)
- Click events for more details

#### Right Panel - Kaisey Chat
- **Chat with Kaisey**: Type messages or use voice input
- **AI Suggestions**: Accept or dismiss smart recommendations
- **Quick Actions**: One-click to accept suggested schedule changes

### Talking to Kaisey

**Adding Events:**
- *"Add gym at 6pm tomorrow"*
- *"Schedule coffee chat with Sarah on Friday at 2pm"*
- *"Block 2 hours for studying on Monday morning"*

**Asking Questions:**
- *"What's on my calendar today?"*
- *"Do I have anything tomorrow afternoon?"*
- *"What does my week look like?"*

**Getting Advice:**
- *"I'm exhausted, should I go to the party tonight?"*
- *"I have a case prep and group meeting at the same time, what should I do?"*
- *"What industries should I network with this month?"*

**Managing Events:**
- *"Move my gym session to 5pm"*
- *"Delete the coffee chat on Thursday"*
- *"Reschedule my study time to tomorrow"*

### Handling Conflicts

When you try to schedule something that conflicts with an existing event:
1. Kaisey will notify you of the conflict
2. Suggest alternative time slots based on the type of activity
3. Let you pick a new time with a simple response like *"Schedule it at 3pm instead"*

---

## Technology Deep Dive

### RAG (Retrieval Augmented Generation)

Kaisey uses RAG to provide MBA-specific advice based on "The kAIsey Protocol" - a playbook of best practices for MBA students.

**How it works:**

1. **Knowledge Base**: The MBA Playbook is divided into 8 semantic chunks covering:
   - Event Tier System (what's Tier 1 vs Tier 4)
   - Recruiting Timeline Phases
   - Coffee Chat Protocol
   - Grade Disclosure Strategy
   - Biometric Recovery States
   - FOMO Filter & Social Logic
   - Scenario Examples
   - Tone & Communication Guidelines

2. **Embedding Generation**: Each chunk is converted to a numerical vector using OpenAI's `text-embedding-3-small` model

3. **Semantic Search**: When you ask a question, your query is also embedded and compared against all chunks using cosine similarity

4. **Context Injection**: The top 3 most relevant chunks are injected into the AI's system prompt, giving Kaisey specific knowledge to answer your question

**Example:**
- You ask: *"I'm exhausted, should I go to the mixer?"*
- RAG finds: "Biometric Recovery States" and "FOMO Filter" chunks
- Kaisey responds with knowledge about Red State (burnout risk), Tier 3 events (mixers are skippable), and recovery recommendations

### MCP (Model Context Protocol)

MCP is a protocol developed by Anthropic that allows AI assistants to securely interact with external tools and data sources.

**How AutoMBA.ai uses MCP:**

1. **MCP Server**: A backend server (`server/mcp-calendar-server.js`) acts as a bridge between the AI and Google Calendar

2. **Available Tools**: The MCP server exposes these tools to the AI:
   - `list_events` - Fetch events from Google Calendar
   - `create_event` - Add new events
   - `update_event` - Modify existing events
   - `delete_event` - Remove events
   - `list_calendars` - View available calendars

3. **Secure Communication**: The frontend communicates with the MCP server via JSON-RPC 2.0 over HTTP

4. **OAuth Integration**: The MCP server handles Google OAuth authentication to securely access calendar data

**Benefits of MCP:**
- Standardized protocol for AI-tool interaction
- Secure handling of API credentials
- Clean separation between AI logic and external services
- Easy to add new integrations (Canvas, Apple Health, etc.)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Timeline   │  │   Chat UI   │  │   Priority Ranking      │ │
│  │    View     │  │  (Kaisey)   │  │   (Drag & Drop)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    RAG Service                           │   │
│  │  • Playbook Chunks → Embeddings → Semantic Search        │   │
│  │  • Cached in localStorage for fast retrieval             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   OpenAI API      │
                    │  • GPT for chat   │
                    │  • Embeddings     │
                    └───────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Calendar Server                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  JSON-RPC 2.0 Endpoint (/mcp)                            │   │
│  │  • list_events, create_event, update_event, delete_event │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Google Calendar API (OAuth 2.0)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, Radix UI, Shadcn/ui |
| State Management | React Context, Hooks |
| AI/LLM | OpenAI GPT-4o-mini, text-embedding-3-small |
| Backend | Express.js, MCP SDK |
| Calendar | Google Calendar API, OAuth 2.0 |
| Animations | Motion (Framer Motion) |
| Hosting | Render |

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- OpenAI API key
- Google Cloud project with Calendar API enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/AutoMBA.ai.git
   cd AutoMBA.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Run the development servers**
   ```bash
   # Run both frontend and MCP server
   npm run dev:all

   # Or run separately:
   npm run dev        # Frontend on http://localhost:5173
   npm run dev:server # MCP server on http://localhost:3000
   ```

### Project Structure

```
AutoMBA.ai/
├── src/
│   ├── app/
│   │   ├── components/     # React components
│   │   │   ├── NexusChatbot.tsx    # Main chat interface
│   │   │   ├── TimelineView.tsx    # Calendar timeline
│   │   │   └── PriorityRanking.tsx # Priority drag-drop
│   │   └── App.tsx         # Main app component
│   ├── contexts/           # React contexts
│   │   ├── CalendarContext.tsx
│   │   └── McpContext.tsx
│   ├── data/
│   │   └── mbaPlaybook.ts  # RAG knowledge chunks
│   ├── utils/
│   │   ├── ragService.ts   # RAG embedding & search
│   │   └── aiRecommendationService.ts
│   └── hooks/
│       └── useMcpServer.ts # MCP client hook
├── server/
│   └── mcp-calendar-server.js  # MCP backend
├── MBA_Playbook_GenAI.pdf  # Source playbook document
└── package.json
```

---

## Future Roadmap

- [ ] **Multi-user OAuth**: Allow any user to login with their Google account
- [ ] **Canvas Integration**: Import assignments and due dates
- [ ] **Apple Health / Whoop**: Biometric data for burnout detection
- [ ] **Mobile App**: React Native version
- [ ] **Persistent Memory**: Remember user's career goals and preferences
- [ ] **LinkedIn Integration**: Pull contact info before coffee chats

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - feel free to use this project for your own MBA journey!

---

## Acknowledgments

- Built with love for MBA students everywhere
- Powered by OpenAI and Anthropic's MCP protocol
- UI components from Shadcn/ui and Radix

---

*"You can only function at 100% capacity in two of the three MBA bodies at any given time. Kaisey's job is to help you choose wisely."*
