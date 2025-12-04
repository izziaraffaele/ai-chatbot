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
| `seekVideo` | Seek video player to a specific timestamp | `{ time: number, reason?: string, videoFolder?: string, videoTitle?: string }` |

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
Where `{filename}` is the mp4 filename with spaces encoded as `+` signs.

### Video Transcripts

Transcripts are fetched from the CDN in JSON format:
```
https://cdn.memoraiz.com/json/HFARM/{folder_name}.json
```
Where `{folder_name}` is the folder name with spaces encoded as `+` signs.

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

# Set API key
export OPENAI_API_KEY="your-key"
```

### Available Scripts

| Script | Description | Output |
|--------|-------------|--------|
| `generate_summaries.py` | Generate titles and summaries for videos | `*_summary.json` |
| `generate_learning_content.py` | Generate quizzes and flashcards | `*_learning_content.json` |

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

The application implements H-FARM's "Sophisticated Academic" design style - combining warmth and approachability with modern professionalism.

### Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--background` | `#F5F3EE` (warm cream) | Navy deep | Main background |
| `--foreground` | `#1a3a52` (navy blue) | Warm cream | Text color |
| `--primary` | Navy blue | Cream | Primary actions, buttons |
| `--border` | `#D5D1C8` | Navy tint | Delicate borders |
| `--accent` | Soft cream | Navy highlight | Hover states |
| `--success` | Professional green | - | Correct/success states |
| `--destructive` | Refined red | - | Error/wrong states |

### Typography

- Clean sans-serif fonts (Geist)
- Semibold headings with tight tracking
- Uppercase labels with `0.05-0.08em` letter-spacing for section headers

### Design Patterns

**Cards & Containers:**
- Subtle `border-border` borders (no heavy shadows)
- `rounded-md` (6px) corners
- Cream backgrounds with card components

**Interactive Elements:**
- Hover: `scale-[1.02]` + border color shift to `primary/30`
- Focus: Navy ring (`ring-primary/20`)
- Transitions: `200-300ms ease-out`

**Quiz Choices:**
- Default: Card with border, hover lifts slightly
- Selected: Navy border + background tint + ring
- Correct: Green border + success background
- Wrong: Red border + destructive background

**Flashcards:**
- Clean card flip animation (500ms)
- Front/back labels in uppercase tracking
- Hover shadow effect

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
| `app/globals.css` | Color palette, typography, utility classes |
| `components/ui/button.tsx` | Navy primary, hover/focus states |
| `components/ui/input.tsx` | Cream background, navy focus ring |
| `components/ui/card.tsx` | Subtle border, no heavy shadows |
| `components/ui/badge.tsx` | `hfarm-navy` and `hfarm-label` variants |
| `components/ui/tabs.tsx` | Navy active indicator |
| `components/chat/thread.tsx` | Generous padding, clean layout |
| `components/chat/message.tsx` | Refined message bubbles |
| `components/activities/quiz/*` | H-FARM styled quiz screens |
| `components/activities/flashcards/*` | H-FARM styled flashcard player |
| `components/app-sidebar.tsx` | Cream sidebar, subtle interactions |
| `components/ui/sidebar.tsx` | Theme variable integration |

---

## Related Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [H-FARM Official Website](https://www.h-farm.com)
- [Next.js Documentation](https://nextjs.org/docs)
