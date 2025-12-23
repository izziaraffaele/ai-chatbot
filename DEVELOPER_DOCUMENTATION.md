# Developer Documentation

## Overview

Pegaso is a sophisticated Next.js-based AI chat application developed by MemorAIz. It features multi-agent AI capabilities powered by Mastra, user authentication, streaming responses, document artifacts, RAG (Retrieval-Augmented Generation), interactive activities, and internationalization support. The application is designed as a white-label solution with extensive customization options.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| Language | TypeScript 5.6+ |
| AI Framework | Mastra Core, AI SDK 5.0 |
| Database | PostgreSQL with Drizzle ORM |
| Vector Store | PgVector (Mastra RAG) |
| Authentication | NextAuth 5.0 (beta) |
| Styling | Tailwind CSS 4.0 |
| UI Components | Radix UI primitives |
| State Management | SWR, React Context |
| Linting | Biome (via Ultracite) |
| Testing | Playwright |

## Architecture

### Directory Structure

```
pegaso/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes & NextAuth config
│   │   ├── auth.ts        # NextAuth configuration
│   │   ├── auth.config.ts # Auth callbacks & session handling
│   │   ├── login/         # Login page
│   │   └── register/      # Registration page
│   ├── (chat)/            # Chat interface & API endpoints
│   │   ├── api/           # API routes (chat, history, votes, etc.)
│   │   ├── chat/          # Chat page with dynamic [id]
│   │   └── page.tsx       # Home page
│   └── layout.tsx         # Root layout with providers
├── artifacts/             # Artifact streaming handlers
├── components/            # React components
│   ├── activities/        # Interactive activities (quiz, flashcards)
│   ├── artifacts/         # Artifact rendering (document, media)
│   ├── chat/              # Chat UI components
│   ├── demo-config/       # Demo configuration panel
│   ├── elements/          # Reusable chat elements
│   ├── tools/             # Tool UI renderers
│   └── ui/                # Base UI primitives (Radix-based)
├── config/                # Configuration schemas & defaults
├── hooks/                 # Custom React hooks
├── lib/                   # Core utilities & business logic
│   ├── activity-tracking/ # Activity state management
│   ├── ai/                # AI models, prompts, entitlements
│   ├── branding/          # Theming & white-label support
│   ├── db/                # Database schema, queries, migrations
│   ├── editor/            # Rich text editor utilities
│   ├── i18n/              # Internationalization
│   └── vector/            # Vector store & embeddings
├── mastra/                # Mastra AI agents & tools
│   ├── agents/            # AI agent definitions
│   ├── tools/             # Custom tool implementations
│   └── utils/             # Runtime utilities
├── data/                  # Data processing scripts & outputs
└── tests/                 # E2E tests with Playwright
```

### Key Architectural Patterns

#### 1. Multi-Agent AI System (Mastra)

The application uses **Mastra** as its AI framework, supporting multiple specialized agents:

**Assistente interno Pegaso** (`mastra/agents/chat-agent/`)
- Primary agent for user interactions
- Dynamic system prompt built from runtime configuration
- Tools: document creation/update, weather, catalog search
- Memory: LibSQL-based conversation history
- Model: Google Gemini 2.5 Flash (configurable)

**Figure Suggester Agent** (`mastra/agents/figure-suggester-agent/`)
- Specialized for recommending professional figures (Figure Professionali)
- Agent-to-agent collaboration (called by Chat Agent during PF Builder)
- Pure LLM reasoning, no external tools
- Used in UF_FIGURE step for AI-assisted figure selection

```typescript
// Mastra initialization (mastra/index.ts)
export const mastra = new Mastra({
  agents: mastraAgents,
  storage: new LibSQLStore({ url: ":memory:" }),
  logger: new PinoLogger({ name: "Mastra", level: "info" }),
});
```

#### 2. Authentication Flow

NextAuth with dual credential providers:

```typescript
// Regular users: Email/password with bcrypt
// Guest users: Auto-generated temporary accounts

Session data:
- user.id: UUID from database
- user.type: "regular" | "guest"
```

**Entitlements by User Type:**
| User Type | Messages/Day | Available Models |
|-----------|--------------|------------------|
| Guest | 20 | chat-model, chat-model-reasoning |
| Regular | 100 | chat-model, chat-model-reasoning |

#### 3. Database Schema (Drizzle ORM)

**Core Tables:**
- `User` - User accounts (id, email, password)
- `Chat` - Conversations with visibility and usage tracking
- `Message_v2` - Chat messages with parts-based content structure
- `Vote_v2` - Message feedback (upvote/downvote)
- `Document` - Artifact storage (text, code, image, sheet, builder)
- `Suggestion` - Document edit suggestions
- `Stream` - Resumable stream tracking
- `TrainingPath` - Professional training paths
- `TrainingModule` - Training modules with ADA competencies

**Relationships:**
```
User → Chat (1:N)
Chat → Message_v2 (1:N)
Chat → Vote_v2 (1:N)
Chat → Stream (1:N)
User → Document (1:N)
Document → Suggestion (1:N)
User → TrainingPath (1:N)
TrainingPath → TrainingModule (1:N)
Chat → TrainingPath (1:N, optional)
```

#### 4. Runtime Configuration System

Three-layer configuration merging:

```
Schema Defaults → Environment Variables → Demo Config (localStorage)
```

**RuntimeConfig Structure:**
```typescript
type RuntimeConfig = {
  assistant: {
    name: string;
    description?: string;
    tone?: string;
    instructions?: string;
    guidelines?: string;
    roles: string[];
  };
  organization: {
    name: string;
    description?: string;
  };
  features: {
    memory: boolean;
    webSearch: boolean;
    artifacts: boolean;
    multimodalInput: boolean;
  };
  environment: { site?: {...}; app?: {...} };
  experiences: Experience[];
  intents: Intent[];
};
```

#### 5. Streaming Architecture

The chat API uses UI message streaming with resumable stream support:

1. **Request validation** with Zod schema
2. **User authentication** & database verification
3. **Rate limit checking** (configurable per user type)
4. **Message handling** (user messages vs assistant tool results)
5. **Stream creation** with usage tracking via TokenLens
6. **Response persistence** in database

```typescript
// Stream creation with callbacks
createUIMessageStream({
  execute: async ({ writer }) => {
    for await (const part of toAISdkFormat(stream)) {
      writer.write(part);
    }
    // Track and persist usage
  },
  onFinish: async ({ responseMessage }) => {
    await saveMessages({ messages: [responseMessage] });
  },
});
```

## Core Systems

### 1. Mastra Tools

**Built-in Tools:**

| Tool | Purpose | Output |
|------|---------|--------|
| `getWeather` | Weather information | Weather data |
| `createDocument` | Create artifacts | Document in canvas |
| `createTrainingPath` | Open training path builder | Builder in canvas |
| `updateDocument` | Edit documents | Updated document |
| `requestSuggestions` | AI suggestions | Document suggestions |
| `catalogSearch` | Search Figure Professionali & ADA catalog with keyword filtering | Filtered search results |

**Tool Context Flow:**
```typescript
// Tools receive runtime context
const runtimeContext = createToolContext(session, {
  geoHints: { longitude, latitude, city, country },
  config: runtimeConfig,
});
```

### 2. Vector Store & RAG

Uses **PgVector** for vector storage with OpenAI embeddings:

```typescript
// Vector store configuration (fallbacks to POSTGRES_URL if MASTRA_POSTGRES_URL not set)
const store = new PgVector({
  connectionString: process.env.MASTRA_POSTGRES_URL || process.env.POSTGRES_URL,
});

// Embedding model
new ModelRouterEmbeddingModel("openai/text-embedding-3-small");
```

**Vector Indexes:**
- `figure_professionali_catalog` - Regione Toscana professional figures, ADAs, capacità, conoscenze

### 3. Activity Tracking System

Framework for interactive experiences within chat:

**Core Concepts:**
- **Attempt** - Single activity instance with lifecycle
- **Events** - Timeline of user interactions
- **Store** - Reactive state container

**Activity Lifecycle:**
```
not_started → in_progress → completed/abandoned
```

**Built-in Activities:**
- **Quiz** - Multiple choice questions with scoring
- **Flashcards** - Card-based learning with confidence tracking

```typescript
// Activity usage
<Player store={createAttemptStore('quiz-123', 'quiz')}>
  <QuizActivity questions={questions} title="Math Quiz" />
</Player>
```

### 4. Internationalization (i18n)

Cookie-based locale management with lazy-loaded translations:

**Supported Locales:** `en`, `it`

```typescript
// Usage in components
const t = useTranslations();
<button>{t("chat.send", "Send")}</button>
```

**Translation files:** `lib/i18n/translations/{en,it}.ts`

### 5. Artifact System

Documents created in chat appear in a side canvas:

**Artifact Types:**
- `text` - Rich text documents
- `code` - Code with syntax highlighting
- `image` - Generated images
- `sheet` - Spreadsheet data
- `builder` - Interactive training path builder (legacy)
- `pf-builder` - Percorso Formativo builder with multi-UF support

**Streaming:** Artifacts stream token-by-token into the canvas.

### 6. Training Path Builder

Interactive builder for creating professional training paths based on Regione Toscana professional figures catalog.

**Architecture:**
```
artifacts/builder/
├── types.ts          # Type definitions (BuilderState, TrainingPath, etc.)
├── reducer.ts        # State machine reducer for builder steps
├── client.tsx        # Artifact definition for canvas rendering
├── server.ts         # Document handler for persistence
├── index.ts          # Public exports
└── components/
    ├── builder-content.tsx    # Main container with Player
    └── steps/
        ├── settore-step.tsx   # Sector selection
        ├── figura-step.tsx    # Professional figure selection
        ├── ada-step.tsx       # ADA/competency selection
        ├── moduli-step.tsx    # Module configuration
        ├── riepilogo-step.tsx # Summary and title
        └── completed-step.tsx # Success screen
```

**Builder Flow:**
```
Settore → Figura → ADA → Moduli → Riepilogo → Completato
```

**State Management:**
- Uses `AttemptStore` from activity-tracking for lifecycle management
- Reducer pattern for step-by-step state transitions
- Wrapped in `Player` component for activity context

**Tool Integration:**
- `createTrainingPath` tool opens the builder in the canvas
- Tool receives context and optional suggestions (settore, figura)
- On completion, training path is persisted to database

**Database Tables:**
- `TrainingPath` - Main training path record
- `TrainingModule` - Individual modules with ADA competencies

### 7. Demo Configuration Panel

White-label customization via localStorage:

**Customizable Areas:**
- Assistant identity (name, avatar, tone)
- Appearance (theme presets, colors, logos)
- Chat (suggestions, features)
- Context (organization, app info)
- Runtime (intents, experiences)

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useRuntimeConfig` | Merged runtime configuration |
| `useDemoConfig` | Demo config from localStorage |
| `useArtifact` | Artifact state management |
| `useArtifactStreaming` | Streaming artifact content |
| `useMessages` | Chat messages with streaming |
| `useChatVotes` | Message voting state |
| `useChatVisibility` | Public/private visibility |
| `useClientTools` | Client-side tool execution |
| `useAssistantAction` | Server action dispatch |
| `useSelectedAgent` | Current agent selection |
| `useScrollToBottom` | Auto-scroll behavior |
| `useMobile` | Responsive breakpoint detection |
| `useBranding` | Theme customization |
| `usePFBuilder` | PF Builder state management with event emission |
| `usePFBuilderEvents` | Subscribe to PF Builder events |

## Error Handling

Custom `ChatSDKError` class with standardized codes:

```typescript
type ErrorCode = `${ErrorType}:${Surface}`;

// Error types: bad_request, unauthorized, forbidden, not_found, rate_limit, offline
// Surfaces: chat, auth, api, stream, database, history, vote, document, suggestions
```

**Common Error Codes:**
| Code | HTTP Status | Message |
|------|-------------|---------|
| `unauthorized:chat` | 401 | Need to sign in |
| `forbidden:chat` | 403 | Wrong user |
| `rate_limit:chat` | 429 | Daily limit exceeded |
| `bad_request:database` | 400 | DB operation failed |

## Data Processing

### CSV to JSON Processor

Python script for processing Italian professional figures data (Regione Toscana):

**Location:** `data/data_processing/process.py`

**Input:** CSV files with transposed format
**Output:** Hierarchical JSON files in `data/output/<csv_name>/`

| File | Content |
|------|---------|
| `settori.json` | Unique sectors list |
| `figure_per_settore.json` | Sectors → Figures mapping |
| `ada_per_figura.json` | Figures → ADAs mapping |
| `dettagli_ada.json` | ADA details (capacità, conoscenze) |

### Data Structures (Professional Figures JSON)

The `data/output/figureProfessionali Regione Toscana/` folder contains a hierarchical data model representing Italian professional qualifications:

#### 1. `settori.json` — Sector List

Simple array of unique sector names (economic/professional sectors).

```typescript
type Settori = string[];
```

**Example:**
```json
[
  "Trasversale",
  "agricoltura zootecnica silvicoltura e pesca",
  "ambiente ecologia e sicurezza",
  "artigianato artistico",
  "informatica",
  "turismo alberghiero e ristorazione"
]
```

#### 2. `figure_per_settore.json` — Professional Figures by Sector

Object mapping each sector to its professional figures with descriptions.

```typescript
type FigurePerSettore = {
  [settore: string]: Array<{
    denominazione_figura: string;  // Figure name with code, e.g. "Tecnico XYZ (123)"
    descrizione: string;           // Detailed role description
  }>;
};
```

**Example:**
```json
{
  "servizi socio-sanitari": [
    {
      "denominazione_figura": "Addetta/o all'assistenza di base (DGR 934 del 31/07/2023) (529)",
      "descrizione": "Operatore del settore socioassistenziale la cui attività è indirizzata..."
    },
    {
      "denominazione_figura": "Responsabile di struttura/servizio sociale (430)",
      "descrizione": "Dirige e coordina il funzionamento di una struttura..."
    }
  ],
  "informatica": [...]
}
```

#### 3. `ada_per_figura.json` — Areas of Activity (ADA) by Figure

Object mapping each professional figure to its competency areas (Aree di Attività).

```typescript
type AdaPerFigura = {
  [denominazioneFigura: string]: Array<{
    denominazione_ada: string;  // Activity area name
    uc: string;                 // Unit code identifier
  }>;
};
```

**Example:**
```json
{
  "Addetta/o all'assistenza di base (DGR 934 del 31/07/2023) (529)": [
    {
      "denominazione_ada": "Assistenza alla persona nelle attività di vita quotidiana",
      "uc": "2263"
    },
    {
      "denominazione_ada": "Supporto nell'attuazione del piano assistenziale personalizzato",
      "uc": "2265"
    }
  ]
}
```

#### 4. `dettagli_ada.json` — ADA Details (Skills & Knowledge)

Object mapping each ADA to its required capabilities and knowledge.

```typescript
type DettagliAda = {
  [denominazioneAda: string]: {
    capacita: string[];     // Array of skills/abilities
    conoscenze: string[];   // Array of knowledge items
  };
};
```

**Example:**
```json
{
  "Assistenza alla persona nelle attività di vita quotidiana": {
    "capacita": [
      "Applicare tecniche per il posizionamento, trasferimento, deambulazione assistita",
      "Facilitare l'assunzione di alimenti e bevande",
      "Preparare i pasti applicando appropriate tecniche di cottura"
    ],
    "conoscenze": [
      "Concetti di base per la tenuta dei farmaci",
      "Principali tecniche di cottura e preparazione dei pasti",
      "Principi di igiene e sicurezza applicati agli spazi di vita"
    ]
  }
}
```

#### Data Hierarchy Diagram

```
settori.json
    │
    └─► figure_per_settore.json
              │
              └─► ada_per_figura.json
                        │
                        └─► dettagli_ada.json

Settore → Figure Professionali → ADA (Aree di Attività) → Capacità + Conoscenze
```

#### Usage in Application

These JSON files power the **catalog search** functionality via RAG:
- Indexed in PgVector as `figure_professionali_catalog`
- Queried by the `catalogSearch` tool
- Enables AI to answer questions about professional qualifications, required skills, and training paths

**To setup the vector index:**
```bash
pnpm vector:setup
```

This will:
1. Load all JSON files from `data/output/figureProfessionali Regione Toscana/`
2. Create embeddings for each Figure Professionale and ADA
3. Store in PostgreSQL with pgvector for semantic search

## Environment Variables

### Required
```bash
POSTGRES_URL=                    # PostgreSQL connection string
AUTH_SECRET=                     # NextAuth secret key
GOOGLE_GENERATIVE_AI_API_KEY=    # Gemini API key
OPENAI_API_KEY=                  # OpenAI (embeddings)
```

### Optional
```bash
MASTRA_POSTGRES_URL=             # Vector store connection (falls back to POSTGRES_URL)
REDIS_URL=                       # Resumable streams
NEXT_PUBLIC_ASSISTANT_NAME=      # Assistant name override
NEXT_PUBLIC_ORGANIZATION_NAME=   # Organization name
NEXT_PUBLIC_DEFAULT_LOCALE=      # Default locale (en/it)
NEXT_PUBLIC_SUPPORTED_LOCALES=   # Comma-separated locales
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start dev server (Turbopack)
pnpm mastra:dev            # Mastra dev tools

# Code quality
pnpm lint                  # Check linting (Ultracite/Biome)
pnpm format                # Auto-fix formatting

# Database
pnpm db:generate           # Generate migrations
pnpm db:migrate            # Run migrations
pnpm db:studio             # Open Drizzle Studio
pnpm db:push               # Push schema changes
pnpm db:pull               # Pull schema from DB

# Vector store
pnpm vector:setup          # Initialize vector indexes

# Testing
pnpm test                  # Run Playwright tests

# Production
pnpm build                 # Build for production
pnpm start                 # Start production server
```

## Testing

E2E tests with Playwright in `tests/` directory:

**Structure:**
- `fixtures.ts` - Test fixtures and setup
- `helpers.ts` - Utility functions
- `pages/` - Page object models
- `prompts/` - Test prompts
- `routes/` - API route tests
- `e2e/` - End-to-end test scenarios

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Send message, stream response |
| `/api/chat` | DELETE | Delete chat |
| `/api/history` | GET | Fetch chat history |
| `/api/vote` | POST/PATCH | Vote on message |
| `/api/document` | GET/POST/PATCH | Manage documents |
| `/api/suggestions` | GET | Get document suggestions |
| `/api/files/upload` | POST | File uploads |

## Recent Changes

### 2024-12-22: Percorso Formativo (PF) Builder
- Added new `pf-builder` artifact type for creating Percorsi Formativi
- Multi-UF support: each Percorso Formativo can contain multiple Unità Formative (UF)
- Each UF can reference different Settore/Figura/ADA combinations
- New state machine with steps: SELECT_TYPE → UF_INPUT → UF_SECTOR → UF_FIGURE → UF_ADA → ADA_DETAILS → SUMMARY
- Event bus system for bidirectional chat-canvas synchronization
- Auto-message feature: chatbot sends welcome message when entering UF_INPUT step
- Fixed split layout: canvas always visible when PF Builder is active
- Created `createPFBuilder` Mastra tool to open the builder
- MVP navigation: Step 0 (Qualifica active, Certificazione disabled) → Step 1 (UF list with Back/Next buttons)
- Full i18n support: all UI strings use translation keys (it/en)

**Chat-to-Canvas UF Sync (2024-12-22):**
- Users can write UF names in chat and they sync to the canvas automatically
- Supported input formats:
  - Bullet/numbered lists: `- Analisi dati` or `1. Analisi dati`
  - Comma-separated: `UF: Analisi, Programmazione, Database`
  - Natural language: `Aggiungi le UF Marketing e Vendite`
- **Merge** (default): Adds new UF while keeping existing ones
- **Replace**: Only when user explicitly says "sostituisci", "ricomincia con", etc.
- Validation: trim whitespace, remove empty entries, deduplicate (case-insensitive)
- New client tool: `pfBuilderUpdateUF` handles the sync
- New reducer actions: `BULK_ADD_UF`, `BULK_REPLACE_UF`
- New event types: `UF_BULK_ADDED`, `UF_BULK_REPLACED`

**Batch UF Sector Selection (2024-12-22):**
- After UF_INPUT, users enter UF_SECTOR step where they assign sectors to ALL UFs at once
- Each UF has a dropdown select populated from `settori.json` (26 sectors)
- Validation: Next button disabled until ALL UFs have a sector assigned
- New action: `SET_UF_SECTOR` updates sector for a specific UF by ID
- New hook method: `setUfSector(ufId, settore)` for batch sector updates
- New helper: `allUfsHaveSector(state)` for batch validation
- Visual feedback: green border for UFs with sector, amber/red warning for missing
- Flow: UF_INPUT → UF_SECTOR (batch) → UF_FIGURE (batch) → ...

**Batch UF Figure Selection with AI Suggestions (2024-12-22):**
- After UF_SECTOR, users enter UF_FIGURE step where they assign figures to ALL UFs at once
- Each UF has a combobox/autocomplete with figures from `figure_per_settore.json`
- Figures are filtered by the UF's selected sector
- Validation: Next button disabled until ALL UFs have a figure assigned
- New action: `SET_UF_FIGURE` updates figure for a specific UF by ID
- New hook method: `setUfFigure(ufId, figura, descrizione)` for batch figure updates
- New helper: `allUfsHaveFigure(state)` for batch validation
- Visual feedback: green border for UFs with figure, amber/red warning for missing

**Figure Suggester Agent (2024-12-22):**
- New Mastra sub-agent: `figureSuggesterAgent` for recommending professional figures
- Located in `mastra/agents/figure-suggester-agent/`
- Purpose: Analyze UF names/descriptions and recommend top 3 most suitable figures
- Input: UF name, settore, list of available figures with descriptions
- Output: Top 3 figure recommendations with brief motivations (Italian)
- Registered as a sub-agent in `chatAgent.agents` for agent-to-agent collaboration
- Chat agent instructions updated to invoke suggester when user asks "consigliami" or "suggerisci"

**Auto-Message for UF_FIGURE Step:**
- When entering UF_FIGURE from UF_SECTOR, an assistant message is injected
- Message informs user they can select figures or ask for AI suggestions
- Event emitted with UF data for suggestions context
- Ref `hasShownUfFigureMessage` prevents duplicate messages

**Batch UF ADA Selection (2024-12-22):**
- After UF_FIGURE, users enter UF_ADA step where they assign ADAs to ALL UFs at once
- Each UF shows as a collapsible card with name and figura
- Expanding a UF reveals all available ADAs from `ada_per_figura.json` (filtered by figura)
- Multiple ADA selection per UF via checkboxes (toggle on/off)
- Each ADA shows: denominazione_ada + codice UC
- Validation: Next button disabled until ALL UFs have at least 1 ADA assigned
- New action: `SET_UF_ADA_TOGGLE` toggles ADA for a specific UF by ID
- New hook method: `toggleUfAda(ufId, adaId, adaName, uc)` for batch ADA updates
- New helper: `allUfsHaveAda(state)` for batch validation
- Visual feedback: green border for UFs with ADA, amber/red warning for missing
- After UF_ADA → ADA_DETAILS: automatically sets `currentUfIndex=0`, `currentAdaIndex=0`
- ADA_DETAILS flows through all ADAs of all UFs, then auto-navigates to SUMMARY

**ADA Details Step with Search/Filter (2024-12-22):**
- After UF_ADA, users enter ADA_DETAILS step to select Capacità and Conoscenze for each ADA
- Data loaded from `dettagli_ada.json` keyed by ADA name
- Two multi-select lists: Capacità (skills) and Conoscenze (knowledge)
- Validation: minimum 2 selections per list required; Next button disabled until valid
- **Search/filter functionality**:
  - Inline search input above each list with Search icon
  - Case-insensitive filtering as user types
  - Filter indicator shows "X di Y risultati" when filter active
  - Clear button (X icon) to reset filter
  - Empty state message when no results match query
  - Filters auto-reset when navigating to different ADA
- Scrollable containers (`max-h-[300px]`) for long lists with overflow
- Selections persist across navigation (stored in `SelectedAdaDetails.selectedCapacita/selectedConoscenze`)
- Flow: iterates through all ADAs of current UF, then moves to next UF's ADAs, finally to SUMMARY

**Architecture:**
```
lib/pf-builder/
├── types.ts               # PFBuilderState, UnitaFormativa, SelectedAdaDetails, events, UfInput, helpers
├── reducer.ts             # State machine with validation + bulk UF/sector/figure/ADA handlers
├── event-bus.ts           # Chat-canvas sync via event bus singleton + debounced emission
├── state-context.tsx      # React context for sharing builder state with chat (PFBuilderStateProvider)
├── debug.ts               # Dev-only logging utilities (logPFBuilderEvent, logPFBuilderSync)
├── data-loader.ts         # Lazy loading of JSON data with caching (loadAdaPerFigura, etc.)
├── client-tool.ts         # pfBuilderNotify client tool for chat notifications
├── update-uf-tool.ts      # pfBuilderUpdateUF client tool for chat-to-canvas UF sync
├── suggest-figures-tool.ts # pfBuilderSuggestFigures client tool for figure suggestions (active)
└── index.ts               # Public exports

mastra/agents/
├── chat-agent/            # Main chat agent with figure suggester as sub-agent + PF Builder awareness
└── figure-suggester-agent/
    ├── index.ts           # Agent definition (pure LLM reasoning, no tools)
    └── system-prompt.ts   # Italian prompt for figure recommendation

components/pf-builder/
├── pf-builder-content.tsx  # Main container with Player
├── pf-builder-inner.tsx    # State management, step routing, chat event handling, auto-messages, state publishing
└── steps/
    ├── select-type-step.tsx    # Qualifica/Certificazione selection
    ├── uf-input-step.tsx       # UF list management (add/remove UFs)
    ├── uf-sector-step.tsx      # BATCH: Settore selection for ALL UFs at once
    ├── uf-figure-step.tsx      # BATCH: Figura selection with combobox for ALL UFs
    ├── uf-ada-step.tsx         # BATCH: ADA selection with checkboxes for ALL UFs
    ├── ada-details-step.tsx    # Capacità/Conoscenze selection (min 2 each) with search/filter
    └── summary-step.tsx        # Final review and creation
```

**Data Model:**
- `PercorsoFormativo`: Container with tipo, titolo, unitaFormative[]
- `UnitaFormativa`: Individual training unit with settore, figura, adaList[]
- `SelectedAdaDetails`: ADA with selected capacità and conoscenze (min 2 each)
- `UfInput`: Simple input type for chat-to-canvas sync `{nome, descrizione?}`

**Chat-Canvas Sync:**
- Event bus emits events for all canvas interactions (with debouncing for high-frequency events)
- Client tool `pfBuilderNotify` forwards events to chat agent
- Client tool `pfBuilderUpdateUF` allows chat to add/replace UF in canvas
- `PFBuilderInner` listens to chat events and dispatches bulk actions
- `PFBuilderInner` publishes state to `PFBuilderStateContext` on every change
- `PFBuilderArtifact` uses `usePFBuilderState()` hook and a ref to provide current state to tools
- Auto-message when user enters UF_INPUT step (see below)

**Chat Agent State Awareness (2024-12-22):**
When the PF Builder is active, the chat agent is aware of the current builder state and can answer questions like "cosa ho selezionato?".

Data Flow:
```
Canvas State Change → PFBuilderInner → PFBuilderStateContext (setState)
                                            ↓
User sends message → ChatProvider → Include pfBuilderState in request body
                                            ↓
Chat API → Extract pfBuilderState → Inject into RuntimeContext
                                            ↓
Chat Agent → buildPFBuilderContextPrompt() → System prompt includes current state
                                            ↓
Agent responds with awareness of UF, settore, figura, ADA selections
```

Key Components:
- `PFBuilderStateProvider`: React context wrapping the chat layout
- `usePFBuilderStateSnapshot()`: Hook to get serializable state for API
- `pfBuilderStateSnapshotSchema`: Zod schema for API validation
- `buildPFBuilderContextPrompt()`: Generates Italian summary of builder state for agent

Debouncing:
- High-frequency events (CAPACITA_TOGGLED, CONOSCENZA_TOGGLED, TITLE_CHANGED) are debounced at 300ms
- Other events emit immediately for responsive UX
- `emitDebouncedCanvasEvent()` for explicit debouncing

Dev Logging:
- `logPFBuilderEvent()`: Logs events with colored output in dev mode
- `logPFBuilderSync()`: Logs when state is synced to context
- `logPFBuilderChatRequest()`: Logs when state is included in chat request
- All logging disabled in production

**Auto-Message Mechanism:**
When user clicks "Qualifica" and enters UF_INPUT step:
1. `PFBuilderInner` detects step change via `useEffect` (prevStep → currentStep)
2. Checks `hasShownUfInputMessage` ref to prevent duplicates
3. Uses `setMessages()` from `useChatMessages()` to inject assistant message
4. Message: "Perfetto. Ora inserisci le Unità Formative (UF)..."
5. The ref persists across navigation (back/forth) to ensure single execution

When user completes sector selection and enters UF_FIGURE step:
1. Same mechanism with `hasShownUfFigureMessage` ref
2. Injects message about figure selection and AI suggestions
3. Emits `STEP_CHANGED` event with UF data for suggestion context
4. User can ask "consigliami" to get AI figure recommendations via `figureSuggesterAgent`

### 2024-12-22: PF Builder Chat State Awareness
- **Feature**: Chat agent now aware of current PF Builder state when responding
- Implemented `PFBuilderStateContext` for sharing builder state between canvas and chat
- Added `pfBuilderState` field to chat API request schema
- Updated `createToolContext()` to inject builder state into RuntimeContext
- New system prompt section `buildPFBuilderContextPrompt()` generates Italian summary
- `PFBuilderInner` publishes state to context on every change
- `ChatProvider` includes builder state snapshot in all chat requests
- **Debouncing**: High-frequency events (capacità/conoscenze toggling, title changes) debounced at 300ms
- **Dev Logging**: Colored console logs for events, state sync, and chat requests (dev only)
- **Result**: User can ask "cosa ho selezionato?" and bot responds with accurate builder state

### 2024-12-22: PF Builder Summary Step with Document Generation
- **Feature**: Enhanced SUMMARY step with comprehensive view and document creation
- New "Crea Documento" button generates a formatted text artifact
- Document structure: PF title → UF (settore → figura → ADA → capacità/conoscenze)
- Document is saved to database and opens in the canvas alongside chat

**Summary Step Enhancements:**
- Statistics badges showing total UF, ADA, capacità, and conoscenze counts
- Expand/collapse all buttons for UF cards
- Enhanced UF cards showing full hierarchy: settore → figura → ADA details
- All capacità and conoscenze are shown (not truncated) in expanded view
- Numbered indices for UF and ADA for easier navigation
- Full i18n support with `pfBuilder.summary.*` translation keys

**Document Generator:**
- New utility: `lib/pf-builder/document-generator.ts`
- `generatePFDocument(state)`: Generates well-formatted Italian Markdown
- `generateDocumentTitle(state)`: Creates title like "Riepilogo - [PF Title]"
- Markdown format with headers, sections, and bullet lists
- Includes all selected capacità and conoscenze (no truncation)

**Document Creation Flow:**
```
SummaryStep → "Crea Documento" click
     ↓
generatePFDocument(state) → Markdown content
     ↓
POST /api/document → Save to database
     ↓
setArtifact() → Open in canvas as text artifact
```

**New Files:**
- `lib/pf-builder/document-generator.ts` - Markdown generation utility

**Updated Files:**
- `components/pf-builder/steps/summary-step.tsx` - Enhanced UI with document button
- `components/pf-builder/pf-builder-inner.tsx` - Document creation handler
- `lib/pf-builder/index.ts` - Export document generator
- `lib/i18n/translations/it.ts` - Italian summary translations
- `lib/i18n/translations/en.ts` - English summary translations

### 2024-12-22: Training Path Builder (Legacy)
- Added interactive training path builder artifact type (`builder`)
- Created `createTrainingPath` Mastra tool to open the builder
- Implemented step-by-step UI: Settore → Figura → ADA → Moduli → Riepilogo
- Added `TrainingPath` and `TrainingModule` database tables
- Integrated with AttemptStore for activity lifecycle management
- Builder renders in canvas split-view alongside chat

### 2024-12-22: Professional Figures Data Documentation
- Added comprehensive documentation of JSON data structures in `data/output/`
- Documented hierarchical relationship: Settori → Figure → ADA → Capacità/Conoscenze

### 2024-12-22: CSV to JSON Data Processing Script
- Added Python script for Regione Toscana professional figures data
- Generates hierarchical JSON structure for sectors, figures, and ADAs

### 2024-12-22: User Existence Validation
- Added `getUserById` function for database verification
- Prevents foreign key violations from stale sessions

## Best Practices

### Code Style
- Follow Ultracite (Biome) rules for consistency
- Use TypeScript strict mode
- Prefer `const` and arrow functions
- Use explicit type annotations for public APIs

### Component Structure
- Use compound component pattern for complex UI
- Separate logic (hooks) from presentation
- Follow naming convention: `ComponentName.tsx`, `use-hook-name.ts`

### State Management
- Use SWR for server state
- Use React Context for cross-cutting concerns
- Avoid prop drilling with composition

### Error Handling
- Always use `ChatSDKError` for API responses
- Log errors with context for debugging
- Provide user-friendly error messages

### 2024-12-22: Build Fixes
- Added missing `@radix-ui/react-popover` dependency for popover components
- Added missing i18n translation keys for PF Builder steps:
  - `pfBuilder.sector.*` - Sector step translations
  - `pfBuilder.figure.*` - Figure step translations
  - `pfBuilder.ada.*` - ADA step translations
- Fixed type errors in chat-canvas sync by using type assertions for client-side tool IDs
- Updated database schema to include `"pf-builder"` in Document.kind enum
- Fixed document tools (update, requestSuggestions) to properly filter non-editable artifact kinds
- Fixed TypeScript implicit `any` type in Popover `onOpenChange` callback

### 2024-12-22: PF Builder Edge Cases & E2E Tests

**Edge Cases Handling:**
- **Duplicate/Empty UFs**: Already handled in reducer with validation
- **Sector without figures**: `uf-figure-step.tsx` now shows warning message when no figures available for selected sector
- **Figure without ADA**: `uf-ada-step.tsx` now shows informative warning with guidance to select different figure
- **ADA not in `dettagli_ada.json`**: `ada-details-step.tsx` gracefully handles missing ADA details with fallback UI

**New Error Codes** (`lib/pf-builder/types.ts`):
```typescript
export const PF_ERROR_CODES = {
  // ... existing
  NO_FIGURES_FOR_SECTOR: "NO_FIGURES_FOR_SECTOR",
  NO_ADA_FOR_FIGURE: "NO_ADA_FOR_FIGURE",
  ADA_DETAILS_NOT_FOUND: "ADA_DETAILS_NOT_FOUND",
} as const;
```

**New i18n Translations**:
- `pfBuilder.errors.duplicateUf` - Duplicate UF name error
- `pfBuilder.errors.emptyUfName` - Empty UF name error
- `pfBuilder.errors.noFiguresForSector` - No figures for sector warning
- `pfBuilder.errors.noAdaForFigure` - No ADA for figure warning
- `pfBuilder.errors.adaDetailsNotFound` - ADA details missing fallback
- `pfBuilder.adaDetails.emptyStateTitle` - Empty state title
- `pfBuilder.adaDetails.emptyStateDescription` - Empty state description
- `pfBuilder.adaDetails.proceedAnyway` - Proceed button for missing details

**Test Infrastructure:**
- **Direct builder route**: `/chat/builder` opens PF Builder canvas directly (bypasses tool call requirement)
- **Test component**: `components/pf-builder/pf-builder-test-chat.tsx` - specialized chat for testing
- **data-testid attributes**: Added to all PF Builder components for Playwright selectors:
  - `pf-builder-container`, `pf-builder-canvas`
  - `pf-select-type-qualifica`, `pf-select-type-certificazione`
  - `pf-uf-input`, `pf-uf-add-button`, `pf-uf-list`, `pf-uf-item`
  - `pf-sector-select`, `pf-figure-select`
  - `pf-ada-item`, `pf-capacita-item`, `pf-conoscenza-item`
  - `pf-next-button`, `pf-back-button`
  - `pf-summary-step`, `pf-create-document-button`, `pf-complete-button`

**Page Object Model** (`tests/pages/pf-builder.ts`):
```typescript
class PFBuilderPage {
  async openBuilder()               // Navigate to /chat/builder
  async selectQualifica()           // Select Qualifica type
  async addUf(name: string)         // Add a UF
  async selectSectorForUf(index, sector)
  async selectFigureForUf(index, figure)
  async selectAdaForUf(index, adaIndex)
  async selectCapacitaAndConoscenze(capCount, conCount)
  async clickNext() / clickBack()
  async expectSummaryStep()
  // ... etc.
}
```

**E2E Tests** (`tests/e2e/pf-builder.test.ts`):
1. **Basic Flow Test**: Qualifica → UF → Settore → Figura → ADA → Dettagli → Summary
2. **Multiple UFs Test**: Verify multiple UFs can be added
3. **Validation Test**: Prevent proceeding without required UF name
4. **Navigation Test**: Back button preserves state
5. **Chat-Canvas Sync Test**: Canvas maintains state during navigation
6. **Edge Case Tests**: Builder visibility, disabled buttons

**Files Created:**
- `app/(chat)/chat/builder/page.tsx` - Test route
- `components/pf-builder/pf-builder-test-chat.tsx` - Test chat component
- `tests/pages/pf-builder.ts` - Page Object Model
- `tests/e2e/pf-builder.test.ts` - E2E test suite

**Files Modified:**
- `lib/pf-builder/types.ts` - Added error codes
- `lib/i18n/translations/it.ts` - Added Italian error messages
- `lib/i18n/translations/en.ts` - Added English error messages
- `components/pf-builder/steps/uf-figure-step.tsx` - Edge case handling + data-testid
- `components/pf-builder/steps/uf-ada-step.tsx` - Edge case handling + data-testid
- `components/pf-builder/steps/ada-details-step.tsx` - Edge case handling + data-testid
- `components/pf-builder/steps/select-type-step.tsx` - data-testid
- `components/pf-builder/steps/uf-input-step.tsx` - data-testid
- `components/pf-builder/steps/uf-sector-step.tsx` - data-testid
- `components/pf-builder/steps/summary-step.tsx` - data-testid
- `components/pf-builder/pf-builder-inner.tsx` - data-testid

### 2024-12-22: Chat Agent System Prompt Optimization for PF Builder

**Feature**: Comprehensive system prompt redesign for optimal PF Builder experience and chat-canvas collaboration.

**Changes to `mastra/agents/chat-agent/system-prompt.ts`:**

1. **Italian UX Assistant Style** - New "STILE DI COMUNICAZIONE" section:
   - Professional, clear, concrete tone with step-by-step guidance
   - Official terminology: PF, UF, Settore, Figura Professionale, ADA, Capacità, Competenze
   - Anti-hallucination rules: don't invent data, ask or propose alternatives
   - Concise responses, bullet points for options

2. **Structured Tool Policy** - New `buildToolPolicyPrompt()` function with sections:
   - PF Builder opening (`createPFBuilder`)
   - Chat-canvas UF sync (`pfBuilderUpdateUF` with merge/replace rules)
   - Figure suggester collaboration (`figureSuggesterAgent`)
   - Catalog search (`catalogSearch`)
   - Document artifacts rules

3. **Enhanced PF Builder Mode** - Expanded `buildPFBuilderContextPrompt()`:
   - Canvas-first behavior rules
   - Step-specific guidance for each builder step
   - Figure suggester collaboration instructions (for UF_FIGURE step)
   - Anti-hallucination rules with explicit data sourcing
   - Detailed current state display with UF status indicators

**Changes to `mastra/agents/chat-agent/index.ts`:**
- Simplified inline tool guidelines (delegated to system-prompt.ts)
- Cleaner message array construction
- Preserved RuntimeConfig compatibility

**Prompt Architecture:**
```
chatAgentSystemPrompt()
├── IDENTITY (Italian)
├── STILE DI COMUNICAZIONE (UX assistant style)
├── Custom guidelines from RuntimeConfig
├── TOOL POLICY (createPFBuilder, pfBuilderUpdateUF, figureSuggesterAgent, catalogSearch)
├── ARTIFACTS & DOCUMENTS
├── EXPERIENCES
└── GEOLOCATION

buildPFBuilderContextPrompt() [when active]
├── PF BUILDER MODE header
├── CANVAS-FIRST behavior rules
├── STEP-SPECIFIC guidance
├── FIGURE SUGGESTER collaboration (UF_FIGURE step)
├── ANTI-HALLUCINATION rules
└── CURRENT STATE (UF details with status indicators)
```

**Acceptance Criteria Met:**
1. Agent uses `createPFBuilder` when user wants to create/start a PF
2. UF messages in chat sync to canvas via `pfBuilderUpdateUF` (merge default, replace on explicit request)
3. Figure suggestions via `figureSuggesterAgent` with top 3 motivations
4. No hallucinated data - uses state or catalogSearch
5. Concise Italian responses with operational guidance

---

### 2024-12-22: Enhanced Catalog Search Tool

**Feature**: Improved `catalogSearch` tool with keyword filtering for more targeted results.

**New Input Parameters:**
- `keywords` (optional): Array of keywords to filter results. Results must contain at least one keyword in name, description, or competencies.
- `settore` (optional): Filter by professional sector (e.g., "informatica", "turismo alberghiero e ristorazione")
- `figuraProfessionale` (optional): Filter ADAs by specific professional figure name

**Usage Examples:**
```typescript
// Find all figures in IT sector
{ query: "sviluppatore", settore: "informatica", collection: "figure", mode: "explore" }

// Find ADAs about databases with keywords
{ query: "gestione dati", keywords: ["database", "sql"], collection: "ada", mode: "content" }

// Find competencies for a specific figure
{ query: "competenze web", figuraProfessionale: "Tecnico", collection: "ada", mode: "content" }
```

**Output Enhancements:**
- `totalFound`: Total number of results before limiting
- `appliedFilters`: Shows which filters were applied
- Truncated descriptions in "explore" mode (200 chars max)
- Limited arrays (capacità/conoscenze) to 3 items in "explore" mode

**Implementation Details:**
- Keywords are matched case-insensitively with accent normalization
- Vector store query uses metadata filtering for `type`, `settore`, and `denominazioneFigura`
- Post-query keyword filtering searches across all relevant text fields
- Fetch limits: 150 for explore (return 50), 50 for content (return 15)

**System Prompt Updates:**
- Added comprehensive `catalogSearch` documentation to TOOL POLICY section
- Includes search strategy examples (generic vs. targeted)
- Best practices for combining query + filters
- Clear examples for each use case (figure search, ADA search, keyword filtering)
- Warning against common mistakes (generic keywords, wrong tool for suggestions)

---

### 2024-12-22: Fix Figure Suggester Invocation in UF_FIGURE Step

**Issue**: When user wrote "consigliami" in UF_FIGURE step, the chatbot incorrectly used `catalogSearch` to search for sectors instead of invoking `figureSuggesterAgent` for figure recommendations.

**Root Cause**: System prompt instructions were not explicit enough about when to use `figureSuggesterAgent` vs `catalogSearch`.

**Solution**: Strengthened system prompt instructions in `mastra/agents/chat-agent/system-prompt.ts`:

1. **Enhanced `buildToolPolicyPrompt()` - Section 2 (Figure-Suggester)**:
   - Added "⚠️ TRIGGER OBBLIGATORIO" header for visibility
   - Explicit trigger phrases: "consigliami", "suggerisci", "suggeriscimi", etc.
   - Bold instruction: "→ DEVI invocare `figureSuggesterAgent` (NON catalogSearch!)"
   - Clear "Regole critiche" section prohibiting catalogSearch for figure suggestions

2. **Enhanced `buildToolPolicyPrompt()` - Section 3 (Ricerca Catalogo)**:
   - Added "⛔ NON usare catalogSearch per:" section
   - Explicit exclusion: "SUGGERIMENTI FIGURE nel passo UF_FIGURE → usa `figureSuggesterAgent`"
   - Clear routing rule for "consigliami/suggerisci" requests

3. **Enhanced `buildPFBuilderContextPrompt()` for UF_FIGURE step**:
   - New imperative header: "⚠️ AZIONE RICHIESTA: FIGURE SUGGESTER"
   - Dynamic list of UFs needing figures with their sectors
   - Clear prohibitions: "⛔ NON usare catalogSearch per suggerire figure!"
   - Step-by-step instructions for invoking sub-agent
   - Output format specification

**Result**: When in UF_FIGURE step and user asks "consigliami", the agent now correctly invokes `figureSuggesterAgent` instead of searching for sectors via `catalogSearch`.

---

### 2024-12-22: Activate pfBuilderSuggestFigures Client Tool

**Issue**: The `figureSuggesterAgent` sub-agent was suggesting professional figures that didn't belong to the UF's selected sector. This caused a mismatch between the suggestions shown in chat and the figures actually available in the UI dropdown.

**Root Cause**: The sub-agent was invoked directly without being passed the filtered list of figures for the specific sector. It generated suggestions based only on textual context, without access to the actual `figure_per_settore.json` data.

**Solution**: Activated the existing `pfBuilderSuggestFigures` client tool which properly filters figures by sector:

1. **New API Endpoint** (`app/(chat)/api/suggest-figures/route.ts`):
   - POST endpoint that calls `figureSuggesterAgent.generate()` server-side
   - Receives prompt, returns AI response text
   - Required because client tools run client-side but the agent is server-side

2. **Tool Registration** (`components/pf-builder/pf-builder-inner.tsx`):
   - Added `useAssistantAction(suggestFiguresTool)` to register tool when builder is active
   - Tool created with `createPFBuilderSuggestFiguresTool()` with dependencies:
     - `getCurrentState`: returns current builder state from ref
     - `getFigurePerSettore`: `loadFigurePerSettore` from data-loader
     - `callSuggesterAgent`: calls `/api/suggest-figures` endpoint

3. **Updated System Prompt** (`mastra/agents/chat-agent/system-prompt.ts`):
   - Changed instructions from "invoke `figureSuggesterAgent`" to "call tool `pfBuilderSuggestFigures`"
   - Tool is called without parameters - it reads state internally
   - Tool automatically filters figures by sector and formats output

**Data Flow (Fixed)**:
```
User: "consigliami"
  ↓
ChatAgent calls pfBuilderSuggestFigures tool
  ↓
Tool reads builder state (UF with settore)
  ↓
Tool loads figure_per_settore.json
  ↓
Tool filters figures for ONLY the UF's sector
  ↓
Tool builds prompt with filtered figures
  ↓
Tool calls /api/suggest-figures → figureSuggesterAgent
  ↓
AI suggests top 3 from ONLY available figures
  ↓
Tool formats and returns message
  ↓
ChatAgent displays suggestions to user
```

**Result**: Figure suggestions now always match the figures available in the UI dropdown, because the AI only sees figures from the correct sector.

**Files Changed**:
- `app/(chat)/api/suggest-figures/route.ts` (new)
- `components/pf-builder/pf-builder-inner.tsx` (tool registration)
- `mastra/agents/chat-agent/system-prompt.ts` (updated instructions)
- `DEVELOPER_DOCUMENTATION.md` (this section)

---

*Last updated: 2024-12-22*
*Documentation version: 2.7*
