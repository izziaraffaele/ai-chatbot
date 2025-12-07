# H-FARM Student Assistant - Developer Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Agents](#agents)
4. [Knowledge Base System](#knowledge-base-system)
5. [Document Creation System](#document-creation-system)
6. [Tools Reference](#tools-reference)
7. [Data Flow](#data-flow)
8. [File Structure](#file-structure)
9. [Adding New Features](#adding-new-features)
10. [Future Development: Video Integration](#future-development-video-integration)
11. [Troubleshooting](#troubleshooting)

---

## Overview

H-FARM Student Assistant is an AI-powered application for **H-FARM**, an Italian innovation hub and university. The primary agent, **H-FARM Assistant**, helps students explore courses, campus life, learning materials, and more.

### Key Features

- **H-FARM Assistant**: AI assistant for students to explore H-FARM's offerings
- **Document Creation**: Create notes, summaries, spreadsheets, and code
- **Bilingual Support**: Italian and English language support
- **Video Library**: Browse and watch course videos with search and filtering

### Key Technologies

- **Next.js 15**: React framework with App Router
- **Mastra**: AI agent framework for tool orchestration
- **OpenAI gpt-5-chat-latest**: Default LLM for chat responses
- **LibSQL**: Memory storage for conversation history
- **TypeScript**: Type-safe codebase

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐   │
│  │  Agent Selector  │───▶│  ChatProvider    │───▶│  RuntimeConfig       │   │
│  │  (H-FARM         │    │  (context.tsx)   │    │  (hooks/)            │   │
│  │   Assistant)     │    └──────────────────┘    └──────────────────────┘   │
│  └──────────────────┘                                      │                 │
│                                                            ▼                 │
│                                              ┌──────────────────────────┐    │
│                                              │  HTTP Transport          │    │
│                                              └──────────────────────────┘    │
│                                                            │                 │
│                                                            ▼                 │
└────────────────────────────────────────────────────────────│─────────────────┘
                                                             │
                                                    HTTP POST /api/chat
                                                             │
                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Chat Route Handler                             │   │
│  │  POST /api/chat                                                       │   │
│  │  1. Validate request                                                  │   │
│  │  2. Authenticate session                                              │   │
│  │  3. Create runtime context                                            │   │
│  │  4. Stream response from H-FARM Assistant                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    H-FARM Assistant Agent                             │   │
│  │  mastra/agents/hfarm/student-assistant/                               │   │
│  │  - Identity: H-FARM student assistant                                 │   │
│  │  - Tools: createDocument, updateDocument, requestSuggestions          │   │
│  │  - Memory: LibSQL for conversation history                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Knowledge Base                                  │   │
│  │  mastra/knowledgebase/hfarm/                                          │   │
│  │  - knowledgebase.md: H-FARM College programs, admissions, info        │   │
│  │  - Video lecture folders with transcripts and learning content        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agents

### Available Agents

| Agent | ID | Description | Avatar |
|-------|-----|-------------|--------|
| **H-FARM Assistant** | `assistente` | H-FARM student assistant for courses, campus, and learning | 🎓 |
| **Researcher** | `researcher` | Web research and synthesis specialist | 🔍 |
| **Quiz Generator** | `quizAgent` | Specialized sub-agent for quiz generation | 🎯 |

### H-FARM Assistant (`mastra/agents/hfarm/student-assistant/`)

The primary agent for H-FARM students.

**Purpose:**
- Help students explore H-FARM courses and programs
- Provide information about campus life and services
- Assist with learning materials and academic support
- Create documents (notes, summaries, code, spreadsheets)
- Browse and watch course videos from the video library

**Configuration:**

```typescript
export const chatAgent = new Agent({
  name: "H-FARM Assistant",
  instructions: ({ runtimeContext }) => {
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);
    const canvasContext = getCanvasContext(runtimeContext);
    return hfarmAssistantSystemPrompt(config, geoHints, canvasContext);
  },
  model: "openai/gpt-5-chat-latest",
  tools: {
    listVideos: mastraTools.listVideos,
    seekVideo: mastraTools.seekVideo,
    hfarmCatalog: mastraTools.hfarmCatalog,  // Semantic search over knowledge base
  },
  agents: {
    quizAgent,  // Sub-agent for quiz generation
  },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:../mastra.db" }),
  }),
});
```

**System Prompt Structure:**
1. **Identity**: H-FARM university AI assistant
2. **Core Capabilities**: Courses, campus, services, learning materials
3. **Video Library**: Browse and search course videos
4. **Knowledge Base Search**: Semantic search using `hfarmCatalog` tool (always called for H-FARM related questions)
5. **Document Creation**: Notes, summaries, code, spreadsheets
6. **Quiz Generation**: Delegates to Quiz Generator sub-agent (prevents duplicate quizzes)
7. **Communication Style**: Friendly, bilingual (IT/EN)

### Quiz Generator Sub-Agent (`mastra/agents/hfarm/quiz-agent/`)

Specialized sub-agent for generating interactive quizzes.

**Purpose:**
- Generate multiple-choice quiz questions from video transcripts
- Create quizzes on specific topics
- Produce educational assessment content

**Configuration:**

```typescript
export const quizAgent = new Agent({
  name: "Quiz Generator",
  description: `Expert quiz generator that creates educational multiple-choice questions.
    Use this agent when users ask for a quiz, test, or assessment about any topic.`,
  instructions: QUIZ_AGENT_SYSTEM_PROMPT,
  model: "openai/gpt-5-chat-latest",
});
```

**Key Files:**
- `mastra/agents/hfarm/quiz-agent/index.ts` - Agent configuration
- `mastra/agents/hfarm/quiz-agent/system-prompt.ts` - Quiz generation guidelines

**Integration with Main Agent:**

The Quiz Generator is configured as a sub-agent of the H-FARM Assistant via the `agents` property:

```typescript
export const chatAgent = new Agent({
  // ...
  agents: {
    quizAgent,
  },
  // ...
});
```

The main agent delegates quiz generation requests to the Quiz Generator sub-agent, which then uses the `createActivity` client tool to render the interactive quiz widget. This ensures only one quiz is created per request.

### Agent Configuration (`lib/ai/agent-config.ts`)

Agents available in the UI selector:

```typescript
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  assistente: {
    id: "assistente",
    name: "H-FARM Assistant",
    description: "Official H-FARM assistant to help students explore courses, campus life, and learning materials",
    avatar: "🎓",
    color: "green",
    registryId: "chatAgent",
  },
  researcher: {
    id: "researcher",
    name: "Researcher",
    description: "Specializes in web research and synthesis",
    avatar: "🔍",
    color: "blue",
    registryId: "researchAgent",
  },
};
```

---

## Knowledge Base System

### Overview

The Knowledge Base System provides infrastructure for loading educational content. It contains H-FARM College information (programs, admissions, etc.) and video-based course materials with transcripts and learning content.

### Directory

```
mastra/knowledgebase/hfarm/
  ├── knowledgebase.md              # Comprehensive H-FARM College information
  ├── background.mp3                # Background music asset
  └── EDITED - Hybrid Course-*/     # Video lecture folders
      ├── *.mp4                     # Video file
      ├── *.json                    # Transcript with segments
      ├── *.txt                     # Plain text transcript
      ├── *_summary.json            # Title and summary
      ├── *_learning_content.json   # Quiz and flashcards
      ├── *_thumbnail.png           # Video thumbnail
      └── *_music.mp3               # Podcast with background music
```

---

## Vector Embedding System

### Overview

The Vector Embedding System provides **semantic search** capabilities over the H-FARM knowledge base. It enables the H-FARM Assistant to search documentation using natural language queries, finding relevant information based on meaning rather than keyword matching.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VECTOR EMBEDDING SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  Markdown Files │────▶│  Ingestion      │────▶│  PostgreSQL     │       │
│  │  (Knowledge     │     │  Pipeline       │     │  + pgvector     │       │
│  │   Base Sources) │     │                 │     │  (Vector Store) │       │
│  └─────────────────┘     └─────────────────┘     └────────┬────────┘       │
│                                                           │                 │
│                          ┌────────────────────────────────┘                 │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  User Query     │────▶│  hfarmCatalog   │────▶│  Search Results │       │
│  │  (Natural       │     │  Tool (Semantic │     │  (Ranked Chunks │       │
│  │   Language)     │     │   Search)       │     │   + Metadata)   │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| **PostgreSQL + pgvector** | Vector storage and similarity search | pgvector extension |
| **OpenAI Embeddings** | Text-to-vector conversion | `text-embedding-3-small` (1536 dims) |
| **Mastra Framework** | Agent orchestration and tool management | `@mastra/core ^0.24.0` |
| **@mastra/pg** | PgVector integration for Mastra | `^0.17.9` |
| **@mastra/rag** | Document processing and chunking | `^1.3.6` |

### File Structure

```
mastra/
├── vectors/
│   ├── index.ts           # Module exports
│   ├── embedder.ts        # OpenAI embedding model configuration
│   └── pgvector.ts        # PgVector store singleton
├── utils/
│   ├── catalog-config.ts  # Catalog definitions (HFARM_CATALOG)
│   └── catalog-ingest.ts  # Ingestion utilities
├── tools/
│   └── hfarm-catalog-tool.ts  # Semantic search tool
├── scripts/
│   └── ingest-hfarm-catalog.ts  # Ingestion script
└── index.ts               # Mastra instance (registers pgVector)
```

### Configuration

#### Catalog Definition (`mastra/utils/catalog-config.ts`)

```typescript
export const HFARM_CATALOG: CatalogDefinition = {
  kbId: "hfarm",
  indexName: "hfarm_catalog",
  sources: [
    {
      id: "knowledgebase",
      filePath: path.join(process.cwd(), "mastra/knowledgebase/hfarm/knowledgebase.md"),
    },
  ],
};
```

#### Embedding Model (`mastra/vectors/embedder.ts`)

```typescript
export const EMBEDDING_MODEL_ID = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;
export const embeddingModel = openai.embedding(EMBEDDING_MODEL_ID);
```

#### Chunking Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `strategy` | `"recursive"` | Recursive splitting respects markdown structure |
| `size` | `1024` | Maximum characters per chunk |
| `overlap` | `128` | Characters overlapping between chunks |

#### Index Configuration (HNSW)

The system uses HNSW (Hierarchical Navigable Small World) index for efficient vector search:

| Parameter | Value | Description |
|-----------|-------|-------------|
| `type` | `"hnsw"` | Graph-based index offering fast search times and high recall |
| `m` | `16` | Maximum connections per node (higher = better recall, more memory) |
| `efConstruction` | `64` | Build-time complexity (higher = better quality, slower build) |
| `metric` | `"cosine"` | Distance metric for similarity search |

### Ingestion Pipeline

Run the ingestion script to populate the vector database:

```bash
pnpm catalog:ingest:hfarm
```

**Process:**
1. Reads markdown files from knowledge base
2. Chunks content using `MDocument.fromMarkdown()` + recursive strategy
3. Generates embeddings using OpenAI's `text-embedding-3-small`
4. Creates pgvector index with cosine similarity
5. Upserts vectors with metadata (`kbId`, `sourceId`, `chunkIndex`, `text`)

**Vector ID Format:** `{kbId}:{sourceId}:{chunkIndex}` (e.g., `hfarm:knowledgebase:42`)

### Search Tool (`hfarmCatalog`)

The H-FARM Assistant uses the `hfarmCatalog` tool for semantic search:

```typescript
// Agent calls this tool
hfarmCatalog({
  queries: ["corso marketing", "admission requirements"],
  topK: 5
})
```

**Features:**
- **Multi-query support**: Up to 5 parallel queries
- **Semantic ranking**: Results ordered by cosine similarity
- **Expansion hints**: Suggestions when results are insufficient

**Output Schema:**
```typescript
{
  results: [{
    query: "corso marketing",
    chunks: [
      { id: "hfarm:knowledgebase:42", text: "...", sourceId: "knowledgebase", score: 0.85 }
    ],
    count: 5
  }],
  totalUniqueResults: 10,
  expansionHints?: ["Try: programmi formativi"]
}
```

### Environment Requirements

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | PostgreSQL connection string with pgvector extension |
| `OPENAI_API_KEY` | OpenAI API key for embedding generation |

### Adding New Catalogs

To add a new knowledge base:

1. **Define catalog** in `mastra/utils/catalog-config.ts`:
```typescript
export const MY_CATALOG: CatalogDefinition = {
  kbId: "my_kb",
  indexName: "my_catalog",
  sources: [{ id: "docs", filePath: path.join(process.cwd(), "path/to/docs.md") }],
};
```

2. **Create search tool** in `mastra/tools/`:
```typescript
export const myCatalogTool = createTool({
  id: "myCatalog",
  description: "Search over my knowledge base",
  // ... similar to hfarmCatalogTool
});
```

3. **Create ingestion script** in `mastra/scripts/`:
```typescript
await ingestCatalog(MY_CATALOG);
```

4. **Register tool** with agent and export from `mastra/tools/index.ts`

### H-FARM College Knowledgebase (`knowledgebase.md`)

A comprehensive markdown document (~1,800 lines) containing detailed information about H-FARM College programs, compiled from 22 official source URLs. The knowledgebase is organized into major sections:

**1. H-FARM College Overview**
- Homepage information, mission statement, program categories
- University courses overview
- Ways to discover H-FARM College (open days, campus visits, brochures)

**2. Bachelor's Degrees - Business & Management**
- **Digital Management** (Ca'Foscari University) - Full curriculum, enhancing courses, learning objectives, FAQs, internal transfer procedures
- **Digital Economics & Finance** - Complete 3-year curriculum with ECTS, payment schedules (EU/Non-EU), application rounds, FAQs
- **International Business Studies** - Curriculum, key topics (geopolitics, cross-cultural communication), faculty info
- **Business Creation & Entrepreneurship** - Startup-focused curriculum, key topics (lean startup, design thinking, fundraising)
- **Marketing & Global Commerce** - Curriculum, key topics (CRM, omnichannel, e-commerce), faculty and job on campus info

**3. Bachelor's Degrees - Innovation & Technology**
- **AI & Data Science** (Microsoft partnership) - Curriculum, Cisco certification access, admission requirements (math assessment)
- **Software & Cloud Architecture with AI** - Curriculum, cloud platforms (AWS, Azure, GCP), DevOps topics

**4. Master's Degrees**
- **Digital Marketing & Data Analytics** (WPP partnership) - 90 ECTS curriculum, key topics, document deadlines per intake
- **AI for Business Transformation** - Python, ML, agentic AI curriculum, capstone project details
- **Entrepreneurship, Startups & Innovation** - Venture-in-residence model, Founder Track vs Corporate Innovator Track
- **Design and Communication** - Creative tools curriculum (Adobe, 3D, video), AI-enhanced communication elective
- **International Business** - Global strategy, supply chain, digital transformation curriculum

**5. Orientation & Admission**
- Complete admission process with EU/Non-EU application rounds and deadlines
- Recognition of prior learning procedures and credit transfer rules
- Orientation weekend schedule and agenda
- "Ask the Students" guidance

**6. Preparatory & Specialized Programs**
- **Champion's Academic Journey** - Basic (free) vs Premium programs for student-athletes
- **Top Up Program** - One-year completion paths for HND holders (5 programs available)
- **Foundation Year** - 60 ECTS preparatory curriculum, entry requirements

**Additional Information:**
- Job on Campus opportunities (LUMINA, FARMEDIA)
- Experiential Term options (internship, pre-accelerator, dissertation)
- Enhancing Courses description
- Contact information

Each program section includes: source URLs, key details tables, full curricula with ECTS, payment schedules, admission requirements, application rounds/deadlines, learning objectives, faculty information, career opportunities, and comprehensive FAQs where applicable.

### Key Components

#### Knowledge Base Loader (`mastra/utils/knowledge-base-loader.ts`)

```typescript
// List all available files
const files = listKnowledgeBaseFiles();

// Find file by partial ID
const fileName = findMatchingFile("course-id");

// Load file with metadata
const content = loadKnowledgeBaseFile("course-id");
```

---

## Document Creation System

### Overview

Students can create various types of documents through the assistant. Each document opens in a separate tab in the side panel.

### Document Types

| Type | Use For | Format |
|------|---------|--------|
| **text** | Notes, summaries, essays, reports | Markdown |
| **code** | Programming exercises, scripts | Source code |
| **sheet** | Tables, lists, data, schedules | CSV |

### Creating Documents

```typescript
// Create a text document
createDocument({
  title: "Notes: Introduction to AI",
  kind: "text"
})

// Create a spreadsheet
createDocument({
  title: "Course Schedule",
  kind: "sheet"
})

// Create a code file
createDocument({
  title: "Python Exercise",
  kind: "code"
})
```

---

## Tools Reference

### H-FARM Assistant Tools

| Tool | Description | Input |
|------|-------------|-------|
| `createDocument` | Create a new document | `{ title: string, kind: "text" \| "code" \| "sheet" }` |
| `updateDocument` | Modify an existing document | `{ id: string, description: string }` |
| `requestSuggestions` | Get suggested follow-up actions | `{}` |
| `listVideos` | Browse course videos from the knowledge base | `{ search?: string }` |
| `seekVideo` | Seek video player to a specific timestamp | `{ time: number, reason?: string, videoFolder?: string, videoTitle?: string }` |
| `hfarmCatalog` | Semantic search over H-FARM knowledge base (auto-called for H-FARM questions) | `{ queries: string[], topK?: number }` |
| `createActivity` | Create interactive quizzes and flashcards | See [Interactive Quiz Generation](#interactive-quiz-generation) |

---

## Data Flow

### Document Creation Flow

```
1. Student: "Create notes about machine learning"
         │
         ▼
2. Agent analyzes request, determines document type
         │
         ▼
3. Agent calls createDocument({
     title: "Notes: Machine Learning",
     kind: "text"
   })
         │
         ▼
4. Document opens in new tab in side panel
         │
         ▼
5. Agent streams content to the document
         │
         ▼
6. Student can view and edit in real-time
```

### Chat Interaction Flow

```
1. Student sends message (Italian or English)
         │
         ▼
2. System detects language automatically
         │
         ▼
3. Agent processes request using system prompt
         │
         ▼
4. Agent responds in same language as student
         │
         ▼
5. If document creation needed, opens in side panel
```

### Interactive Quiz Generation Flow

```
1. Student: "Create a quiz about this video" / "Fammi un quiz"
         │
         ▼
2. Agent analyzes context (video transcript, topic, etc.)
         │
         ▼
3. Agent calls createActivity tool with quiz data:
   {
     type: "quiz",
     title: "Quiz: Topic Name",
     content: { quiz: [...questions] }
   }
         │
         ▼
4. Quiz widget appears in chat as interactive component
         │
         ▼
5. Student interacts with quiz (answers questions, sees feedback)
         │
         ▼
6. Quiz completion tracked and reported back to agent
```

---

## Interactive Quiz Generation

### Overview

The H-FARM Assistant can generate interactive quizzes directly in the chat using the `createActivity` client tool. Quizzes appear as interactive widgets where students can answer questions, receive immediate feedback, and track their scores.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CHAT UI                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 ActivityToolProvider                     │    │
│  │  - Registers createActivity via useAssistantAction      │    │
│  │  - Returns immediately (non-blocking)                   │    │
│  │  - Tracks completion status for analytics               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    ActivityTool UI                       │    │
│  │  - Renders quiz widget from tool call input             │    │
│  │  - Uses QuizActivity component                          │    │
│  │  - Tracks completion via resolveActivity                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Client Tool Call (non-blocking)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       H-FARM ASSISTANT                          │
├─────────────────────────────────────────────────────────────────┤
│  - Receives quiz request from student                           │
│  - Delegates to Quiz Generator sub-agent                        │
│  - Sub-agent generates quiz questions following guidelines      │
│  - Sub-agent calls createActivity tool with quiz data           │
│  - Tool returns immediately, agent completes response           │
└─────────────────────────────────────────────────────────────────┘
```

### createActivity Tool Input Schema

```typescript
{
  type: "quiz",                              // Activity type
  title: string,                             // Quiz title
  description?: string,                      // Optional description
  difficulty: "easy" | "medium" | "hard",    // Difficulty level
  objectives: string[],                      // Learning objectives
  content: {
    quiz: Array<{
      id: string,                            // UUID for the question
      question: string,                      // Question text
      choices: string[],                     // 4 answer choices
      correctAnswerIndex: number,            // 0-based index of correct answer
      explanation?: string                   // Why the answer is correct
    }>
  }
}
```

### Quiz Question Guidelines

The agent follows these principles when generating quiz questions (from `quiz-agent/system-prompt.ts`):

1. **Clarity**: Each question should be clear, specific, and unambiguous
2. **Single Concept**: Test one concept at a time
3. **Avoid Negatives**: Don't use double negatives or complex wording
4. **Plausible Distractors**: Include common misconceptions as wrong answers
5. **No Bias**: Randomize correct answer position
6. **Brief Explanations**: 1-2 sentences explaining the correct answer

### Key Files

| File | Purpose |
|------|---------|
| `mastra/agents/hfarm/quiz-agent/index.ts` | Quiz Generator sub-agent |
| `mastra/agents/hfarm/quiz-agent/system-prompt.ts` | Quiz generation guidelines |
| `components/tools/activity.tsx` | Client tool registration and UI rendering |
| `components/activities/quiz/` | Quiz UI components (player, components, schema) |
| `lib/ai/client-tools.ts` | Client tool infrastructure |

### Example Tool Call

When a student asks "Create a quiz about research methodology", the agent generates:

```json
{
  "type": "quiz",
  "title": "Quiz: Research Methodology",
  "description": "Test your understanding of research methods",
  "difficulty": "medium",
  "objectives": ["Understand research methods", "Apply methodological concepts"],
  "content": {
    "quiz": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "question": "What is the primary purpose of a literature review?",
        "choices": [
          "To summarize existing research on a topic",
          "To collect new data",
          "To publish findings",
          "To interview experts"
        ],
        "correctAnswerIndex": 0,
        "explanation": "A literature review summarizes and synthesizes existing research to establish context and identify gaps."
      }
    ]
  }
}
```

### Trigger Phrases

**Italian:**
- "Fammi un quiz su..."
- "Creami delle domande su..."
- "Verifica la mia comprensione di..."
- "Test su questo video"

**English:**
- "Create a quiz about..."
- "Test me on..."
- "Give me questions about..."
- "Quiz me on this video"

---

## Chat Streaming Behavior

### Overview

During LLM streaming (when the assistant is actively generating a response), certain UI interactions are disabled to prevent race conditions and ensure a consistent user experience.

### Disabled During Active Streaming

When `status === "streaming"` (actively receiving content):

**Chat Interactions:**
- Chat input textarea - users cannot type new messages
- Submit button shows stop icon (clicking stops the stream)
- Attachment menu
- Speech input button

### Enabled After Streaming Ends

When streaming completes (even if waiting for client tool results like quiz/flashcard completion):

**Chat Interactions:**
- Chat input textarea - users can type new messages
- Submit button - shows spinner during "submitted" state, send icon when "ready"
- Attachment menu
- Speech input button
- Agent selector

**In-Chat Activities:**
- Quiz "Start Quiz" button - enabled when `part.state === "input-available"`
- Quiz choice buttons
- Quiz confirm/next buttons
- Flashcard "Start Study" button
- Flashcard navigation buttons
- Flashcard flip interactions

**Canvas Interactions:**
- Video library activities (quiz/flashcards) remain fully interactive
- Document editing in canvas
- Video playback controls

### Implementation Details

**Key Files:**
| File | Description |
|------|-------------|
| `components/assistant-chat.tsx` | Uses `status === "streaming"` for chat input disabled state |
| `components/chat/composer.tsx` | Handles disabled state for textarea, attachment menu |
| `components/tools/activity.tsx` | Uses `part.state` to determine if activity is ready for interaction |
| `components/activities/quiz/index.tsx` | Accepts `disabled` prop, disables buttons |
| `components/activities/flashcards/index.tsx` | Accepts `disabled` prop, disables buttons |

**Streaming Status Detection:**
```typescript
// In components that need streaming status
const { chat } = useChatRuntime();
const { status } = useChat({ chat });

// Only disable during active content streaming
// This allows interaction when waiting for client tools (e.g., quiz/flashcard completion)
const isChatStreaming = status === "streaming";
```

**Activity Disabled Prop:**
Activities use the tool part's state to determine if they should be interactive, not the overall chat streaming status. This prevents a deadlock where the chat waits for the tool to complete but the user can't interact with it.

```typescript
// Activity is ready when tool input has been fully streamed
const isActivityReady = part.state === "input-available" || part.state === "output-available";

// Quiz and Flashcard activities accept disabled prop based on part state
<QuizActivity activity={activity} disabled={!isActivityReady} />
<FlashcardActivity activity={activity} disabled={!isActivityReady} />
```

**Why This Works:**
1. Chat input blocks only during active streaming to prevent race conditions
2. The `createActivity` tool returns immediately (non-blocking) so the agent completes its response right after generating quiz content
3. After streaming ends, chat goes to "ready" state allowing users to type new messages
4. Activities are enabled based on `part.state`, not chat status, so they unlock as soon as tool input is fully streamed
5. Users can interact with the quiz OR write new messages - neither blocks the other

---

## File Structure

```
mastra/
├── agents/
│   ├── hfarm/
│   │   ├── student-assistant/
│   │   │   ├── index.ts           # H-FARM Assistant configuration
│   │   │   └── system-prompt.ts   # Bilingual system prompt
│   │   └── quiz-agent/
│   │       ├── index.ts           # Quiz Generator sub-agent
│   │       └── system-prompt.ts   # Quiz generation guidelines
│   ├── research-agent/
│   │   └── index.ts               # Research agent
│   └── index.ts                   # Agent exports
├── knowledgebase/
│   └── hfarm/
│       ├── knowledgebase.md       # H-FARM College info (programs, admissions)
│       └── EDITED - Hybrid...     # Video lecture folders
├── tools/
│   ├── index.ts                   # Tool exports
│   └── ...                        # Various tools
├── utils/
│   ├── knowledge-base-loader.ts   # KB utilities
│   └── runtime-utils.ts           # Runtime context
└── index.ts                       # Mastra instance

app/
├── (chat)/
│   └── api/
│       └── chat/
│           └── route.ts           # Main chat endpoint

lib/
├── ai/
│   └── agent-config.ts            # UI agent configuration
├── video/
│   └── transcript.ts              # Video transcript utilities
└── ...

components/
├── chat/
│   ├── canvas.tsx                 # Resizable canvas layout
│   ├── canvas-tabs.tsx            # Tab bar component
│   └── agent-selector.tsx         # Agent selection UI
└── tools/
    └── ...                        # Tool UI components
```

---

## Adding New Features

### Adding a New Agent to UI

1. Define agent in `mastra/agents/`:

```typescript
export const myAgent = new Agent({
  name: "My Agent",
  instructions: "...",
  model: "openai/gpt-5-chat-latest",
  tools: { ... },
});
```

2. Export from `mastra/agents/index.ts`

3. Add to `lib/ai/agent-config.ts`:

```typescript
myAgent: {
  id: "myAgent",
  name: "My Agent",
  description: "Description for UI",
  avatar: "🤖",
  color: "purple",
  registryId: "myAgent",
},
```

### Adding Content to Knowledge Base

1. Add files to `mastra/knowledgebase/hfarm/`
2. Files will be automatically discovered by `listKnowledgeBaseFiles()`

---

## Video Integration

### Features

The H-FARM Assistant supports video content integration:

1. **Video Library Browsing**: Access H-FARM lectures, tutorials, and educational videos via `listVideos` tool
2. **Search Filtering**: Search videos by title, week (e.g., "W1"), lesson (e.g., "L2"), or topic
3. **Video Player**: Integrated video player in the canvas panel
4. **Metadata Display**: Duration, week/lesson labels, and descriptions
5. **Welcome Message with Video Library**: Auto-opens video library on page load

### Welcome Message (`components/chat/welcome-message.tsx`)

The welcome message is always visible in the chat, even after the user sends their first message. It displays:
1. A friendly introduction explaining the assistant's capabilities
2. A video library widget that auto-opens the video library panel
3. Videos fetched via the `/api/videos` endpoint

**Welcome Message Content:**
- Introduction to the H-FARM College assistant
- List of capabilities (answering questions, creating quizzes, making flashcards)
- Pro tip about video timestamp navigation
- Video library widget with video count and total duration

**Canvas Thread Optimization:**
The canvas thread uses a `canvasThreadActive` state to optimize rendering during streaming, deferring message rendering until user interaction (hover/focus). However, the welcome message must always be visible on initial load. The condition `canvasThreadActive || messages.length === 0` ensures the welcome message renders immediately when there are no messages, while maintaining the streaming optimization for subsequent interactions.

**Key Files:**
- `components/chat/welcome-message.tsx` - Welcome message component
- `app/api/videos/route.ts` - Videos API endpoint
- `components/assistant-chat.tsx` - Canvas thread rendering logic

### Videos API (`app/api/videos/route.ts`)

REST endpoint to fetch available videos from the knowledge base:

```typescript
// GET /api/videos
// Returns: { success: boolean, videos: VideoMetadata[], totalCount: number }
```

This endpoint mirrors the `listVideosTool` functionality but is accessible via HTTP for client-side fetching.

### `listVideosTool` (`mastra/tools/list-videos-tool.ts`)

The tool scans the knowledge base directory and extracts video metadata:

```typescript
// List all videos
listVideos({})

// Search for specific topic
listVideos({ search: "research" })

// Filter by week
listVideos({ search: "W1" })
```

**Output:**
```typescript
{
  success: boolean;
  videos?: VideoMetadata[];
  totalCount?: number;
  error?: string;
}
```

**VideoMetadata structure:**
- `id`: URL-safe identifier
- `title`: Extracted from folder name
- `description`: First sentences from transcript
- `duration`: From JSON transcript (seconds)
- `videoUrl`: CDN URL (e.g., `https://cdn.memoraiz.com/video/HFARM/{filename}.mp4`)
- `thumbnailUrl`: CDN URL for video thumbnail (e.g., `https://cdn.memoraiz.com/images/{folder_name}_thumbnail.png`)
- `folder`: Original folder name
- `week`: Week number (e.g., "W1")
- `lesson`: Lesson number (e.g., "L1")

### Knowledge Base Structure

Videos are stored in `mastra/knowledgebase/hfarm/`:

```
mastra/knowledgebase/hfarm/
├── EDITED - Hybrid Course-... W1 L1 What is Research/
│   ├── *.mp4          # Video file
│   ├── *.json         # Transcript with segments
│   ├── *.txt          # Plain text transcript
│   └── *.mp3          # Audio versions
└── ...
```

### UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ListVideosTool` | `components/tools/list-videos.tsx` | Tool result display card |
| `VideoLibraryArtifact` | `components/artifacts/video-library.tsx` | Full video library panel with grid and player views |
| `VideoPlayerView` | `components/artifacts/video-library.tsx` | Video player with transcript and learning content |
| `VideoLearningContent` | `components/artifacts/video-library.tsx` | Quiz/Flashcards tabs below video player |
| `VideoTranscript` | `components/artifacts/video-transcript.tsx` | Auto-scrolling transcript panel |
| `TranscriptToggleButton` | `components/artifacts/video-transcript.tsx` | Button to toggle transcript visibility |

**Video Player View**: The player view displays only a header bar (with back button, title, transcript toggle, and duration) and the video player. Video metadata (badge, title, description, duration details) is shown only in the header, keeping the player view clean and focused.

### Video Serving

Videos are served from the Memoraiz CDN at `https://cdn.memoraiz.com/video/HFARM/`. The video URL format is:
```
https://cdn.memoraiz.com/video/HFARM/{filename}.mp4
```
Where `{filename}` is the mp4 filename with spaces replaced with `+` signs, then URL-encoded (so `+` becomes `%2B`).

**Example:**
- Original filename: `EDITED - Hybrid Course-20251130 1032-1 W2 L1 What is Data.mp4`
- CDN URL: `https://cdn.memoraiz.com/video/HFARM/EDITED%2B-%2BHybrid%2BCourse-20251130%2B1032-1%2BW2%2BL1%2BWhat%2Bis%2BData.mp4`

### Video Thumbnails

Generated thumbnails are served from the CDN at `https://cdn.memoraiz.com/images/`. The thumbnail URL format is:
```
https://cdn.memoraiz.com/images/{folder_name}_thumbnail.png
```
Where `{folder_name}` is the folder name with spaces replaced with `+` signs, then URL-encoded (so `+` becomes `%2B`).

**Utility function:**
```typescript
import { buildThumbnailUrl } from "@/lib/video/transcript";

// Build thumbnail URL for a video
const thumbnailUrl = buildThumbnailUrl(video.folder);
```

Thumbnails are displayed in both grid and list views of the video library, and as the poster image in the video player.

### Video Transcripts

Transcripts are fetched from the CDN in JSON format:
```
https://cdn.memoraiz.com/json/HFARM/{folder_name}.json
```
Where `{folder_name}` is the folder name with spaces replaced with `+` signs, then URL-encoded (so `+` becomes `%2B`).

**Transcript JSON structure:**
```typescript
{
  detected_language?: string;
  segments: Array<{
    start: number;  // Start time in seconds
    end: number;    // End time in seconds
    text: string;   // Transcript text
  }>;
}
```

### Video Transcript Features

1. **Auto-scrolling Transcript Panel**: Collapsible panel that displays the video transcript with timestamps
2. **Synchronized Highlighting**: Current segment is highlighted based on video playback time
3. **Click-to-seek**: Click any segment to jump to that timestamp in the video
4. **Agent Context Integration**: When a video is playing, the transcript is automatically provided to the agent via `viewedContent`

### Video Learning Content (Quiz & Flashcards)

When a video is opened, the player displays interactive learning activities below the video:

1. **Quiz Tab**: Multiple-choice questions to test comprehension
2. **Flashcards Tab**: Review cards for key concepts from the video

**Learning Content CDN URL:**
```
https://cdn.memoraiz.com/json/HFARM/{folder_name}_learning_content.json
```

**JSON Structure:**
```typescript
{
  quiz: Array<{
    id: string;
    question: string;
    choices: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }>;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
  }>;
}
```

**Components:**
- `VideoLearningContent`: Displays tabbed quiz/flashcard interface below video player
- Uses existing `QuizActivity` and `FlashcardActivity` components for consistent UX
- Shows loading spinner while fetching content
- Gracefully handles missing content (shows "no activities available")

### Transcript & Learning Content Utilities (`lib/video/transcript.ts`)

```typescript
// Build CDN URL for transcript
buildTranscriptUrl(folderName: string): string

// Fetch transcript from CDN
fetchTranscript(folderName: string): Promise<TranscriptData | null>

// Build CDN URL for learning content
buildLearningContentUrl(folderName: string): string

// Fetch learning content (quiz & flashcards) from CDN
fetchLearningContent(folderName: string): Promise<LearningContentData | null>

// Format timestamp (seconds) to MM:SS or HH:MM:SS
formatTimestamp(seconds: number): string

// Find current segment index based on video time
findCurrentSegmentIndex(segments: TranscriptSegment[], currentTime: number): number

// Format transcript for agent context
formatTranscriptForAgent(transcript: TranscriptData, videoTitle: string): string
```

### Agent Video Context

When a student is watching a video, the agent automatically receives the video transcript in its context. This allows the agent to:
- Answer questions about "this video" or "what was said"
- Reference specific timestamps (e.g., "At 2:30, the speaker discusses...")
- Create summaries of the video content
- Help students find specific topics within the video
- **Seek to specific timestamps** when students ask where something is discussed

The system prompt has special handling for video transcripts that provides:
- Full transcript with timestamps
- Instructions on how to use the transcript information
- Guidance on creating study materials from video content
- Instructions for using the `seekVideo` tool

### Video Seek Tool (`seekVideo`)

The `seekVideo` tool allows the agent to control the video player, jumping to specific timestamps when students ask about where something is discussed.

**Architecture:**
```
1. Student: "When does the speaker talk about research?"
         │
         ▼
2. Agent analyzes transcript in its context
         │
         ▼
3. Agent finds "[2:30] Let's discuss research..."
         │
         ▼
4. Agent calls seekVideo({ time: 150, reason: "Research discussion" })
         │
         ▼
5. Tool returns success → UI component triggers seek
         │
         ▼
6. Video player seeks to 2:30 and starts playing
```

**Files involved:**
| File | Purpose |
|------|---------|
| `lib/video/seek-store.ts` | Pub/sub store for seek events |
| `mastra/tools/seek-video-tool.ts` | Server-side Mastra tool |
| `components/tools/seek-video.tsx` | Tool UI component (triggers seek) |
| `components/artifacts/video-library.tsx` | Video player (subscribes to seek events) |

**Usage examples:**
```typescript
// Agent calls this tool (with video context for reopening if canvas is closed)
seekVideo({ 
  time: 150, 
  reason: "Research methodology discussion",
  videoFolder: "EDITED - Hybrid Course-20251129 1631-1 W1 L6 Research",
  videoTitle: "Research Methodology" 
})

// Output shown to user
{ 
  success: true, 
  time: 150, 
  formattedTime: "2:30", 
  reason: "Research methodology discussion",
  videoFolder: "...",
  videoTitle: "..."
}
```

**Canvas closed behavior:**
When the user clicks the seek widget and the canvas is closed, the tool UI component:
1. Opens the video library tab with a single video in the content array
2. VideoLibraryArtifact detects single video and auto-switches to player mode (no grid view)
3. Waits 500ms for the video player to mount
4. Triggers the seek to the specific timestamp

**Trigger phrases (Italian/English):**
- "Quando si parla di X?" / "When is X discussed?"
- "Portami al punto dove..." / "Take me to the part where..."
- "Dove viene spiegato X?" / "Where is X explained?"

---

## Canvas Tab System

The canvas panel (right side of the application) supports a multi-tab system for working with multiple documents.

### Widget Kinds

| Kind | Label | Multiple Allowed | Streaming |
|------|-------|------------------|-----------|
| `text` | Text Document | Yes | Yes |
| `code` | Code | Yes | Yes |
| `sheet` | Spreadsheet | Yes | Yes |
| `image` | Image | Yes | No |
| `markdown-viewer` | Markdown Viewer | Yes | No |
| `video-library` | Video Library | No | No |

---

## Troubleshooting

### Common Issues

#### Agent Not Responding in Expected Language

**Check**:
1. User's message language is clear
2. System prompt includes bilingual instructions
3. No conflicting runtime configuration

#### Document Not Opening in Side Panel

**Check**:
1. `createDocument` tool is registered in agent
2. Correct parameters are passed
3. Canvas component is mounted

#### Vector Table Does Not Exist Error

**Error**: `Vector table "hfarm_catalog" does not exist`

**Solution**: Run the ingestion script to populate the vector database:
```bash
pnpm tsx mastra/scripts/ingest-hfarm-catalog.ts
```

**Check**:
1. `POSTGRES_URL` environment variable is set
2. `OPENAI_API_KEY` environment variable is set
3. PostgreSQL has pgvector extension enabled

#### Duplicate Item Error in OpenAI API

**Error**: `Duplicate item found with id fc_xxx`

**Cause**: When the client sends tool results back to continue the conversation, it may include message parts that already exist in the database (like tool-call parts), creating duplicates in the conversation history.

**Solution**: The `handleAssistantMessage` function in `app/(chat)/api/chat/route.ts` includes deduplication logic that filters out parts with `toolCallId` that already exist in the message before concatenating new parts.

### Debug Logging

Console logs prefixed with relevant tags:

```
[KB] Knowledge base operations
[Agent] Agent-related logs
[Tools] Tool execution logs
```

---

## Temporary Testing Configuration

### Rate Limiting

Rate limiting may be disabled for testing. Check `lib/ai/entitlements.ts` for current settings.

---

## Content Generation Scripts

### Overview

Python scripts in `scripts/` automate content generation for the knowledge base using OpenAI's API.

### Prerequisites

```bash
# Install dependencies
pip install -r scripts/requirements.txt

# Set API keys (as needed)
export OPENAI_API_KEY="your-openai-key"      # For generate_learning_content.py, generate_summaries.py, sync_knowledgebase.py
export GEMINI_API_KEY="your-gemini-key"      # For generate_thumbnails.py, sync_knowledgebase.py
export ELEVENLABS_API_KEY="your-key"         # For podcast_creation.py, sync_knowledgebase.py
export REPLICATE_API_TOKEN="your-token"      # For transcribe_videos.py, sync_knowledgebase.py

# For CDN uploads (sync_knowledgebase.py only)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_SESSION_TOKEN="your-session-token"  # Optional, for temporary credentials
```

### Available Scripts

| Script | Description | Output |
|--------|-------------|--------|
| `generate_summaries.py` | Generate titles and summaries for videos | `*_summary.json` |
| `generate_learning_content.py` | Generate quizzes and flashcards | `*_learning_content.json` |
| `generate_thumbnails.py` | Generate flat design illustration thumbnails | `thumbnail.png` |
| `sync_knowledgebase.py` | Full sync: generate missing assets and upload to CDN | All asset types |

### `generate_learning_content.py`

Processes transcript files and generates learning materials:

```bash
python scripts/generate_learning_content.py
```

**Features:**
- Scans `mastra/knowledgebase/hfarm/` subfolders for `.txt` files
- Skips `*_music.txt` files and existing `*_learning_content.json` files
- Uses GPT 5.1 to generate 10 quiz questions + 10 flashcards per transcript
- Generates unique UUIDs for all items

**Output Format:**
```json
{
  "quiz": [
    {
      "id": "uuid",
      "question": "Question text?",
      "choices": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0,
      "explanation": "Why this is correct"
    }
  ],
  "flashcards": [
    {
      "id": "uuid",
      "front": "Question/prompt",
      "back": "Answer/explanation",
      "hint": "Helpful hint"
    }
  ]
}
```

**Schema Compatibility:**
- Quiz format matches `components/activities/quiz/schema.tsx` (`ModelQuizQuestion`)
- Flashcard format matches `components/activities/flashcards/schema.tsx` (`ModelFlashcard`)

### `generate_thumbnails.py`

Generates flat design illustration thumbnails for lecture videos using Google's Gemini image generation API:

```bash
python scripts/generate_thumbnails.py [--force]
```

**Features:**
- Scans `mastra/knowledgebase/hfarm/` subfolders for `.txt` transcript files
- Extracts lecture title from folder name (e.g., "W1 L1 What is Research")
- Uses transcript content to generate contextual image prompts
- Creates flat design, modern vector illustration thumbnails
- Saves as `thumbnail.png` in each lecture folder
- Skips folders that already have thumbnails (use `--force` to regenerate)

**Options:**
- `--force`: Regenerate thumbnails even if they already exist

**Requirements:**
- `GEMINI_API_KEY` environment variable must be set
- Uses Google Gemini's `gemini-2.0-flash-preview-image-generation` model

**Output:**
- `thumbnail.png` in each lecture subfolder
- Image style: Modern flat design, clean shapes, limited color palette, no text

### `sync_knowledgebase.py`

Unified script that ensures all required assets exist for each knowledge base folder and uploads them to the CDN:

```bash
python scripts/sync_knowledgebase.py [--generate-only] [--upload-only] [--force]
```

**Features:**
- Scans `mastra/knowledgebase/hfarm/` subfolders
- Detects missing required files per folder
- Generates missing assets in correct dependency order
- Uploads all assets to S3 bucket with correct CDN paths and metadata

**Execution Order (based on dependencies):**

```
MP4 (input)
   │
   ▼
Phase 1: Transcription (WhisperX via Replicate)
   │
   ├──► {stem}.json (transcript with segments)
   └──► {stem}.txt (plain text)
          │
          ▼
Phase 2: Content Generation (requires .txt)
   │
   ├──► generate_summary ──► {stem}_summary.json
   ├──► generate_learning_content ──► {stem}_learning_content.json
   ├──► generate_thumbnail (Gemini) ──► {stem}_thumbnail.png
   └──► podcast_creation (ElevenLabs) ──► {stem}.mp3
                                            │
                                            ▼
Phase 3: Music Overlay (requires .mp3)
   │
   └──► add_background_music (pydub) ──► {stem}_music.mp3
                                            │
                                            ▼
Phase 4: Upload to CDN
```

**Required Files Per Folder:**
| File Pattern | Description |
|--------------|-------------|
| `{stem}.json` | Transcript JSON with segments (WhisperX) |
| `{stem}.txt` | Raw transcript text |
| `{stem}.mp3` | Podcast audio (ElevenLabs TTS) |
| `{stem}.mp4` | Video file (source, input) |
| `{stem}_learning_content.json` | Quiz and flashcards |
| `{stem}_summary.json` | Title and summary |
| `{stem}_thumbnail.png` | Thumbnail image (Gemini) |
| `{stem}_music.mp3` | Podcast with background music overlay |

**CDN Path Mapping:**
| File Type | CDN Path |
|-----------|----------|
| Transcript JSON | `json/HFARM/{folder_name}.json` |
| Learning Content | `json/HFARM/{folder_name}_learning_content.json` |
| Summary | `json/HFARM/{folder_name}_summary.json` |
| Thumbnail | `images/{folder_name}_thumbnail.png` |
| Podcast Audio | `audio/HFARM/{folder_name}.mp3` |
| Music Track | `audio/HFARM/{folder_name}_music.mp3` |
| Raw Transcript | `text/HFARM/{folder_name}.txt` |
| Video | `video/HFARM/{folder_name}.mp4` |

Note: Spaces in folder names are replaced with `+` and then URL-encoded (so `+` becomes `%2B`) in CDN URLs.

**Options:**
- `--generate-only`: Only generate missing files, skip upload
- `--upload-only`: Only upload existing files, skip generation
- `--force`: Regenerate and re-upload even if files exist

**Environment Variables:**
```bash
# For transcription
export REPLICATE_API_TOKEN="your-replicate-token"

# For content generation
export OPENAI_API_KEY="your-openai-key"
export GEMINI_API_KEY="your-gemini-key"
export ELEVENLABS_API_KEY="your-elevenlabs-key"

# For S3 upload
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_SESSION_TOKEN="your-session-token"  # Optional, for temporary credentials
```

**S3 Upload Metadata:**
- `Cache-Control: max-age=31536000` (1 year cache)
- `Content-Type`: Automatically set based on file extension (application/json, audio/mpeg, image/png, video/mp4, text/plain)

**Upload Logging:**
- Large files (>10MB) show file size during upload
- Missing files show `⚠ Skipped (not found)` warning

**S3 Bucket:** `memoraiz-media`

**CDN Base URL:** `https://cdn.memoraiz.com`

### Flashcard CSS Utilities

The flashcard component uses a true 3D flip animation with CSS transforms defined in `app/globals.css`:

| Utility | CSS Property | Purpose |
|---------|--------------|---------|
| `perspective-1000` | `perspective: 1000px;` | Create 3D depth for viewing |
| `transform-3d` | `transform-style: preserve-3d;` | Enable 3D space on element |
| `preserve-3d` | `transform-style: preserve-3d;` | Preserve 3D transforms |
| `backface-hidden` | `backface-visibility: hidden;` | Hide card back during flip |
| `rotate-y-0` | `transform: rotateY(0deg);` | Card front facing position |
| `rotate-y-180` | `transform: rotateY(180deg);` | Flip card to show back |
| `duration-600` | `transition-duration: 600ms;` | Custom animation duration |

**3D Flip Animation Structure:**

The flashcard uses a two-layer structure for smooth 3D flipping:
1. **Perspective wrapper** (`data-slot="flashcard-perspective"`): Provides the 3D viewing depth
2. **Inner container** (`data-slot="flashcard"`): Rotates on Y-axis to flip
3. **Card sides** (`data-slot="flashcard-side"`): Front/back both have `backface-visibility: hidden`

**Key Features:**
- `cubic-bezier(0.4, 0.0, 0.2, 1)` timing for natural motion
- Front card at `rotateY(0deg)`, back at `rotateY(180deg)`
- Container rotates 180deg on flip, revealing back while hiding front
- Hint displayed via tooltip on question mark button (top-right of card)
- "Next" button disabled until user has flipped the card at least once

---

## H-FARM Visual Identity

### Design System Overview

The application implements a unified Memoraiz visual identity:
1. **Chat Interface**: Modern gradient style with cyan accents
2. **Canvas/Artifacts & Activities**: Memoraiz brand palette (cyan primary, deep blue text)

### Chat Interface Design

The main chat experience uses a lavender-to-beige gradient background with glass-morphism effects.

**Chat Color Tokens (Memoraiz Logo Palette):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-hf-deep-blue` | `#111042` | Primary text color (from Memoraiz logo) |
| `--color-hf-cyan` | `#43a6cf` | Primary accent - cyan pillar |
| `--color-hf-cyan-light` | `#5bb8dd` | Lighter cyan for gradients |
| `--color-hf-yellow` | `#ffbe2c` | Secondary accent - yellow pillar |
| `--color-hf-red` | `#ff3266` | Tertiary accent - red/pink pillar |
| `--color-hf-lavender-start` | `#E8E4F3` | Gradient start |
| `--color-hf-lavender-mid` | `#F5E6E8` | Gradient middle |
| `--color-hf-beige-end` | `#F0E8D5` | Gradient end |

**Chat Shadow Tokens:**

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-chat-md` | `0 4px 12px rgba(0,0,0,0.06)` | Message bubbles |
| `--shadow-chat-lg` | `0 10px 30px rgba(0,0,0,0.12)` | Input area, buttons |

**Chat Components:**

| Component | Style |
|-----------|-------|
| `ChatThread` | Gradient background (`from-hf-lavender-start via-hf-lavender-mid to-hf-beige-end`) |
| `ChatCanvasThread` | Same gradient background as ChatThread for visual consistency when canvas is open |
| `ChatThreadHeader` | Glass-morphism (`bg-white/60 backdrop-blur-sm`) with gold avatar branding |
| `ChatMessageBubble (assistant)` | White rounded bubble with deep-blue text (`rounded-3xl bg-white/95 text-hf-deep-blue/90`) |
| `ChatMessageBubble (user)` | Transparent wrapper - actual text styled in `message-parts.tsx` with cyan (`bg-hf-cyan text-white`) |
| `AssistantAvatar` | Animated `memo.gif` for assistant messages |
| `UserMessage` | No avatar displayed - only the cyan message bubble |
| `InputGroup` | White rounded container with subtle shadow (`rounded-3xl bg-white shadow-md`) |
| `InputGroupTextarea` | White background with top border radius to match container (`rounded-t-3xl bg-white`) |
| `PromptInputBody` | White background wrapper for textarea area (`flex flex-col bg-white`) |
| `PromptInputSubmit` | Cyan gradient button (`from-hf-cyan to-hf-cyan-light`) |

**Chat Input Footer Layout:**

The chat input footer follows this layout pattern (left to right):
- **Plus button**: Opens attachment menu (`hover:bg-hf-gold/10`)
- **Agent selector badge**: Rounded pill with H-FARM logo icon, agent name, and chevron (`bg-[#F5F5F5]`)
- **Spacer**: `justify-between` creates space between tools and actions
- **Mic button**: Gold-colored microphone icon (`text-hf-gold`)
- **Send button**: Gold gradient circular button

**ChatAgentSelector Styling:**

```tsx
// Badge with H-FARM logo icon
<button className="flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-1.5">
  <span className="flex size-5 items-center justify-center overflow-hidden rounded-full">
    <Image src="/images/hfarm_logo.png" alt="H-FARM" width={20} height={20} className="object-cover" />
  </span>
  <span className="text-hf-deep-blue text-sm">{agentName}</span>
  <ChevronDown className="size-4 text-hf-deep-blue/60" />
</button>
```

### Base Color Palette

**Note:** The application only supports light mode. Dark theme has been removed.

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#F5F3EE` (warm cream) | Main background |
| `--foreground` | `#1a3a52` (navy blue) | Text color |
| `--primary` | Navy blue | Primary actions, buttons |
| `--border` | `#D5D1C8` | Delicate borders |
| `--accent` | Soft cream | Hover states |
| `--success` | Professional green | Correct/success states |
| `--destructive` | Refined red | Error/wrong states |

### Typography

- Clean sans-serif fonts (Geist)
- Semibold headings with tight tracking
- Uppercase labels with `0.05-0.08em` letter-spacing for section headers

### Design Patterns

**Cards & Containers:**
- Subtle `border-border` borders (no heavy shadows)
- `rounded-md` (6px) corners for general UI
- `rounded-3xl` for chat bubbles and input
- Cream backgrounds with card components

**Interactive Elements:**
- Hover: `scale-[1.02]` + border color shift to `hf-cyan/40`
- Focus: Cyan ring (`ring-hf-cyan/20`)
- Transitions: `200-300ms ease-out`

**Quiz Choices (Memoraiz Styled):**
- Default: Card with `border-border`, hover lifts slightly with `bg-hf-cyan/5`
- Selected: Cyan border + background tint (`border-hf-cyan bg-hf-cyan/10 text-hf-cyan`)
- Correct: Green border + success background
- Wrong: Red border + destructive background
- Progress bar: `bg-hf-cyan` on `bg-hf-cyan/20` track
- Buttons: `bg-hf-cyan hover:bg-hf-cyan-light text-white`

**Flashcards (Memoraiz Styled):**
- Clean card flip animation (600ms)
- Front/back labels in uppercase tracking with `text-hf-deep-blue/60`
- Card border: `border-hf-cyan/20`
- Reveal button: `bg-hf-cyan` when hidden, outline with cyan when revealed
- Hint button: Yellow accent (`border-hf-yellow text-hf-yellow`)
- Progress bar: `bg-hf-cyan` on `bg-hf-cyan/20` track

**Canvas Tabs (Memoraiz Styled):**
- Active: `bg-hf-cyan text-white border-hf-cyan`
- Inactive: `bg-hf-cyan/5 text-hf-deep-blue/70 border-hf-cyan/20`
- Pending indicator: `bg-hf-cyan` with `bg-hf-cyan-light` ping animation
- Streaming indicator: `bg-hf-yellow`

**UI Tabs (Memoraiz Styled):**
- List background: `bg-hf-cyan/5`
- Active trigger: `bg-white text-hf-deep-blue border-hf-cyan/30`
- Hover: `bg-hf-cyan/10 text-hf-deep-blue`

### CSS Utility Classes

| Class | Usage |
|-------|-------|
| `hfarm-label` | Uppercase tracking labels |
| `hfarm-section-header` | Section header styling |
| `hfarm-card` | Card with subtle border |
| `hfarm-card-interactive` | Hover-enabled card |
| `hfarm-btn` | Custom button base |
| `hfarm-input` | Input styling |
| `hfarm-selected` | Selection indicator |

### Key Files Modified

| File | Changes |
|------|---------|
| `app/globals.css` | Color palette, typography, chat tokens, utility classes |
| `components/chat/thread.tsx` | Gradient background, glass-morphism header, ChatHeaderBranding with H-FARM logo |
| `components/chat/message.tsx` | AssistantAvatar, UserAvatar, ChatMessageBubble components |
| `components/messages/assistant-message.tsx` | New bubble styling with AssistantAvatar |
| `components/messages/user-message.tsx` | Cyan bubble styling without avatar |
| `components/chat/welcome-message.tsx` | Updated to use new bubble and avatar styling |
| `components/ui/input-group.tsx` | Rounded chat input styling |
| `components/elements/prompt-input.tsx` | Gold gradient submit button |
| `components/elements/conversation.tsx` | Styled scroll-to-bottom button |
| `components/ui/button.tsx` | Navy primary, hover/focus states |
| `components/ui/input.tsx` | Cream background, navy focus ring |
| `components/ui/card.tsx` | Subtle border, no heavy shadows |
| `components/ui/badge.tsx` | `hfarm-navy` and `hfarm-label` variants |
| `components/ui/tabs.tsx` | Memoraiz cyan active indicator |
| `components/chat/canvas-tabs.tsx` | Memoraiz cyan tab colors |
| `components/activities/quiz/*` | Memoraiz styled quiz (cyan accent, deep blue text) |
| `components/activities/flashcards/*` | Memoraiz styled flashcard player (cyan accent) |
| `components/artifacts/video-library.tsx` | Memoraiz styled learning content tabs |
| `components/app-sidebar.tsx` | Cream sidebar, subtle interactions |
| `components/ui/sidebar.tsx` | Theme variable integration |

---

## AWS Production Deployment

### Overview

The application is configured for deployment to AWS using:
- **AWS Amplify Hosting**: Managed Next.js SSR hosting
- **Amazon RDS PostgreSQL**: Database with pgvector extension
- **CloudWatch**: Interaction logging and monitoring

### Key Configuration Files

| File | Purpose |
|------|---------|
| `amplify.yml` | AWS Amplify build configuration for pnpm/Next.js |
| `scripts/aws/setup-rds.sh` | Automated RDS PostgreSQL setup script |
| `scripts/aws/setup-cloudwatch.sh` | CloudWatch log group and dashboard setup |
| `docs/AWS_DEPLOYMENT_GUIDE.md` | Complete deployment guide |
| `docs/env-production-example.txt` | Production environment variables template |

### Rate Limiting

Session-based rate limiting is configured in `lib/ai/entitlements.ts`:

```typescript
export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerDay: 50,  // Guest sessions (no login required)
  },
  regular: {
    maxMessagesPerDay: 200, // Registered users
  },
};
```

### Interaction Logging

User interactions are logged to CloudWatch via `lib/analytics/cloudwatch-logger.ts`:

- Log group: `/hfarm/interactions`
- Data captured: userId, userType, chatId, messageRole, agentId, timestamp, geoHints
- Retention: 30 days

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | RDS PostgreSQL connection string (**must include `?sslmode=require`**) |
| `OPENAI_API_KEY` | OpenAI API key for LLM |
| `AUTH_SECRET` | NextAuth.js secret (32+ chars) |
| `AUTH_URL` | Production URL for auth callbacks |
| `AWS_REGION` | AWS region for CloudWatch logging |
| `NODE_ENV` | Set to `production` |

### Deployment Commands

```bash
# Set up RDS PostgreSQL
./scripts/aws/setup-rds.sh

# Set up CloudWatch monitoring
./scripts/aws/setup-cloudwatch.sh

# Run database migrations
POSTGRES_URL="..." pnpm db:migrate

# Ingest vector catalog
POSTGRES_URL="..." pnpm catalog:ingest:hfarm
```

See `docs/AWS_DEPLOYMENT_GUIDE.md` for complete deployment instructions.

---

## Related Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [H-FARM Official Website](https://www.h-farm.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
