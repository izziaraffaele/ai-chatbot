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
- **OpenAI GPT-5.1**: Default LLM for chat responses
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
│  │                   Knowledge Base (Future)                             │   │
│  │  mastra/knowledgebase/hfarm/                                          │   │
│  │  - Placeholder for H-FARM educational content                         │   │
│  │  - Video metadata and course materials (planned)                      │   │
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
  model: "openai/gpt-5.1",
  tools: {
    createDocument: mastraTools.createDocument,
    updateDocument: mastraTools.updateDocument,
    requestSuggestions: mastraTools.requestSuggestions,
    listVideos: mastraTools.listVideos,
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
4. **Document Creation**: Notes, summaries, code, spreadsheets
5. **Communication Style**: Friendly, bilingual (IT/EN)

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

The Knowledge Base System provides infrastructure for loading educational content. Currently a placeholder, it will be populated with H-FARM course materials and video metadata in future updates.

### Directory

```
mastra/knowledgebase/hfarm/
  └── (placeholder for future content)
```

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

---

## File Structure

```
mastra/
├── agents/
│   ├── hfarm/
│   │   └── student-assistant/
│   │       ├── index.ts           # H-FARM Assistant configuration
│   │       └── system-prompt.ts   # Bilingual system prompt
│   ├── research-agent/
│   │   └── index.ts               # Research agent
│   └── index.ts                   # Agent exports
├── knowledgebase/
│   └── hfarm/
│       └── (placeholder for future content)
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
  model: "openai/gpt-5.1",
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
| `VideoLibraryArtifact` | `components/artifacts/video-library.tsx` | Full video library panel |

### Video Serving

Videos are served from the Memoraiz CDN at `https://cdn.memoraiz.com/video/HFARM/`. The video URL format is:
```
https://cdn.memoraiz.com/video/HFARM/{filename}.mp4
```
Where `{filename}` is the mp4 filename with spaces encoded as `+` signs.

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

## Related Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [H-FARM Official Website](https://www.h-farm.com)
- [Next.js Documentation](https://nextjs.org/docs)
