# Fondazione CON IL SUD Assistant - Developer Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Agents](#agents)
4. [Knowledge Base System](#knowledge-base-system)
5. [Catalog System](#catalog-system)
6. [Tools Reference](#tools-reference)
7. [Data Flow](#data-flow)
8. [File Structure](#file-structure)
9. [Adding New Features](#adding-new-features)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Fondazione CON IL SUD Assistant is an AI-powered application for **Fondazione CON IL SUD** (Foundation for the South of Italy). The system provides two assistants:
- **Asse (External)**: Public-facing assistant for information about the Foundation and bandi
- **Assi (Internal)**: Internal assistant for staff with document management capabilities

### Key Features

- **Dual Assistants**: Public (Asse) and Internal (Assi) facing assistants
- **Knowledge Base**: Indexed markdown files (Chairos manual, website content, bandi)
- **Semantic Search**: pgvector-powered semantic search over knowledge base
- **Document Management**: Canvas tabs for creating and editing documents
- **File Browser**: Visual file browser for bandi documents
- **Italian Interface**: System prompt and interactions in Italian

### Key Technologies

- **Next.js 15**: React framework with App Router
- **Mastra**: AI agent framework for tool orchestration
- **Google Gemini**: Default LLM for chat responses
- **pgvector**: Vector database for semantic search
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
│  │  (Asse/Assi)     │    │  (context.tsx)   │    │  (hooks/)            │   │
│  └──────────────────┘    └──────────────────┘    └──────────────────────┘   │
│                                                            │                 │
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
│  │  4. Stream response from selected agent                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Fondazione Agents                                  │   │
│  │  mastra/agents/fondazione_con_il_sud/                                 │   │
│  │  - Asse: Public-facing assistant                                      │   │
│  │  - Assi: Internal assistant with document management                  │   │
│  │  - Tools: fondazioneBandi, fondazioneBrowser, catalog                 │   │
│  │  - Memory: LibSQL for conversation history                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   pgvector Semantic Search                            │   │
│  │  mastra/vectors/pgvector.ts                                           │   │
│  │  - Indexed Chairos manual                                             │   │
│  │  - Indexed website knowledge base                                     │   │
│  │  - Semantic query over embeddings                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agents

### Available Agents

| Agent | ID | Description | Avatar |
|-------|-----|-------------|--------|
| **Researcher** | `researcher` | Web research and synthesis specialist | 🔍 |
| **Fondazione Asse** | `sfc_asse` | Public-facing Fondazione CON IL SUD assistant | 🌉 |
| **Fondazione Assi** | `sfc_assi` | Internal Fondazione CON IL SUD assistant with document management | 🏢 |

### Fondazione CON IL SUD Agent - Asse (`mastra/agents/fondazione_con_il_sud/asse/`)

An assistant for **Fondazione CON IL SUD** that provides information about the foundation and guides users through available bandi (announcements).

**Purpose:**
- Answer general questions about the Foundation (mission, areas of intervention, governance, history)
- List available bandi with brief descriptions
- Load and explain specific bando details on user request
- Guide users through requirements, deadlines, and application procedures

**Knowledge Base (pgvector indexed):**
- **Chairos Manual** (`mastra/knowledgebase/fondazione_con_il_sud/chairos.md`): Operational procedures, forms, and guidelines
- **Website KB** (`mastra/knowledgebase/fondazione_con_il_sud/website_kb.md`): Foundation mission, governance, projects, contacts
- **Bandi** (`mastra/knowledgebase/fondazione_con_il_sud/bandi/<category>/<bando>.md`): Individual markdown files organized by category. Loaded on-demand via `fondazioneBandi` tool.

**Configuration:**

```typescript
export const sfcAsseAgent = new Agent({
  name: "Assistente Fondazione CON IL SUD – Asse",
  instructions: sfcAsseSystemPrompt,
  model: "openai/gpt-5.1",
  tools: {
    fondazioneBandi: fondazioneBandiTool,
    catalog: fondazioneCatalogTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:../mastra.db" }),
  }),
});
```

**Tools:**

| Tool | Purpose | Usage |
|------|---------|-------|
| `fondazioneBandi` | Manage bandi (announcements) | `mode="list"` for metadata, `mode="load"` for full content |
| `catalog` | Semantic search over indexed docs | `queryText` for natural language search |

**Workflow:**
1. User asks general question → Agent calls `catalog({ queries: ["..."] })` for semantic search
2. User asks "Quali bandi sono disponibili?" → Agent calls `fondazioneBandi({ mode: "list" })`
3. Agent shows brief list and asks user to select one
4. User selects a bando → Agent calls `fondazioneBandi({ mode: "load", bandoId: "..." })`
5. Agent answers questions using the loaded bando content or catalog results

### Fondazione CON IL SUD Internal Agent - Assi (`mastra/agents/fondazione_con_il_sud/assi/`)

An **internal** assistant for **Fondazione CON IL SUD** staff that provides document management capabilities with the canvas tab system, plus access to the knowledge base.

**Purpose:**
- Help internal staff review and manage documents
- Create and update documents (text, code, spreadsheets) using canvas tabs
- Access knowledge base for Foundation information
- Browse and review bandi (announcements)

**Note:** This is the INTERNAL version for Foundation staff. For public-facing assistant, see the "Asse" agent.

**Configuration:**

```typescript
export const sfcAssiAgent = new Agent({
  name: "Assistente Interno Fondazione CON IL SUD – Assi",
  instructions: ({ runtimeContext }) => {
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);
    return sfcAssiSystemPrompt(config, geoHints);
  },
  model: "openai/gpt-5.1",
  tools: {
    createDocument: createDocumentTool,
    updateDocument: updateDocumentTool,
    requestSuggestions: requestSuggestionsTool,
    fondazioneBandi: fondazioneBandiTool,
    fondazioneBrowser: fondazioneBrowserTool,
    catalog: fondazioneCatalogTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:../mastra.db" }),
  }),
});
```

**Tools:**

| Tool | Purpose | Usage |
|------|---------|-------|
| `createDocument` | Create text/code/sheet documents in canvas tabs | `title`, `kind` ("text", "code", "sheet") |
| `updateDocument` | Modify existing documents | `id`, `description` of changes |
| `requestSuggestions` | Provide writing suggestions | Document-aware suggestions |
| `fondazioneBandi` | Manage bandi (announcements) | `mode="list"` or `mode="load"` |
| `fondazioneBrowser` | Visual file browser for bandi | `action="list"` or `action="read"` |
| `catalog` | Semantic search over indexed docs | Multi-query semantic search |

**Canvas Tab System:**
- Each document opens in a separate tab in the sidebar panel
- Multiple documents can be open simultaneously
- Users can switch between tabs like a web browser
- Tabs can be closed individually

### Agent Configuration (`lib/ai/agent-config.ts`)

Agents available in the UI selector:

```typescript
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  researcher: {
    id: "researcher",
    name: "Researcher",
    description: "Specializes in web research and synthesis",
    avatar: "🔍",
    color: "blue",
    registryId: "researchAgent",
  },
  sfc_asse: {
    id: "sfc_asse",
    name: "Fondazione CON IL SUD - Esterno",
    description: "Assistente pubblico per informazioni sulla Fondazione e bandi",
    avatar: "🌉",
    color: "orange",
    registryId: "sfcAsseAgent",
  },
  sfc_assi: {
    id: "sfc_assi",
    name: "Fondazione CON IL SUD - INTERNO",
    description: "Assistente interno per gestione documenti e knowledge base",
    avatar: "🏢",
    color: "purple",
    registryId: "sfcAssiAgent",
  },
};
```

---

## Knowledge Base System

### Overview

The Knowledge Base System provides access to Fondazione CON IL SUD's documents, including the Chairos operational manual, website content, and bandi (announcements).

### Key Components

#### 1. Bandi Loader (`mastra/utils/fondazione-kb-loader.ts`)

```typescript
// List all bandi with metadata (no content)
const bandi = listBandiMetadata();
// Returns: [{ id, slug, title, shortDescription, status, deadline }, ...]

// Load specific bando with full content
const bando = loadBandoByIdOrSlug("sport");
// Returns: { id, slug, title, content, ... }
```

#### 2. File System Browser (`mastra/utils/fondazione-fs-loader.ts`)

```typescript
// List directory contents
const items = listDirectory("sport_e_periferie");
// Returns: [{ name, type, path, extension }, ...]

// Read file content
const content = readFileContent("sport_e_periferie/bando.md");
// Returns: string content
```

### Bandi Structure

```
mastra/knowledgebase/fondazione_con_il_sud/bandi/
├── evado_a_lavorare/
│   └── bando.md
├── sport_e_periferie/
│   ├── bando.md
│   └── requirements.csv
└── ...
```

---

## Catalog System (pgvector Semantic Search)

### Overview

The Catalog System provides semantic search capabilities over markdown knowledge bases using pgvector. It enables agents to retrieve relevant snippets from indexed documents based on natural language queries.

### Key Components

#### 1. Catalog Configuration (`mastra/utils/catalog-config.ts`)

```typescript
export const FONDAZIONE_CATALOG: CatalogDefinition = {
  kbId: "fondazione_con_il_sud",
  indexName: "fondazione_catalog",
  sources: [
    { id: "chairos", filePath: ".../chairos.md" },
    { id: "website", filePath: ".../website_kb.md" },
  ],
};
```

#### 2. Catalog Tool (`mastra/tools/catalog-tool.ts`)

```typescript
// Multi-query semantic search
const result = await fondazioneCatalogTool.execute({
  context: {
    queries: ["quali sono le aree di intervento?", "governance"],
    topK: 5
  }
});
// Returns: { results: [...], totalUniqueResults, expansionHints }
```

#### 3. Vector Infrastructure (`mastra/vectors/`)

```typescript
// embedder.ts
export const EMBEDDING_MODEL_ID = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;
export const embeddingModel = openai.embedding(EMBEDDING_MODEL_ID);

// pgvector.ts
export const PGVECTOR_STORE_NAME = "pgVector";
export const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_URL,
});
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | PostgreSQL connection string with pgvector extension |
| `OPENAI_API_KEY` | OpenAI API key for embeddings |

### Ingestion Commands

```bash
# Ingest Fondazione CON IL SUD catalog
pnpm catalog:ingest:fondazione
```

---

## Tools Reference

### Fondazione CON IL SUD Tools

| Tool | Description | Input |
|------|-------------|-------|
| `fondazioneBandi` | List or load bandi from knowledge base | `{ mode: "list" \| "load", bandoId?: string }` |
| `fondazioneBrowser` | Visual file browser for bandi files | `{ action: "list" \| "read", path?: string }` |
| `catalog` | Semantic search over indexed docs | `{ queries: string[], topK?: number }` |

**fondazioneBandi Modes:**

| Mode | Input | Output |
|------|-------|--------|
| `list` | None | Array of `{ id, slug, title, shortDescription, status, deadline }` (no content) |
| `load` | `bandoId` (id, slug, or partial title) | Full bando `{ id, slug, title, shortDescription, status, deadline, content }` |

**fondazioneBrowser Actions:**

| Action | Input | Output |
|--------|-------|--------|
| `list` | `path` (optional, default: root) | `{ action: "list", path, items: FondazioneFsItem[] }` |
| `read` | `path` (required) | `{ action: "read", path, extension, content }` |

**Widget Behavior:**
- When `action: "list"` is called, the "Esplora Documenti" widget opens automatically in the canvas panel
- Root view shows a grid of folder cards for top-level bando categories
- Explorer view shows list-based navigation for subfolders
- `.md` files open in an inline markdown viewer within the widget
- `.csv` files open in a **new** sheet tab for spreadsheet viewing

### Fondazione File System API Endpoint

**Path:** `GET /api/fondazione/fs`

Used by the Fondazione Browser widget to browse and read files from the bandi directory.

```typescript
// List directory contents
GET /api/fondazione/fs?action=list&path={relativePath}

// Response (success)
{
  success: true,
  action: "list",
  path: string,
  items: FondazioneFsItem[]
}

// Read file content
GET /api/fondazione/fs?action=read&path={relativePath}

// Response (success)
{
  success: true,
  action: "read",
  path: string,
  extension: string | null,
  content: string
}
```

**Security:**
- All paths are validated to prevent directory traversal attacks
- Only files within `mastra/knowledgebase/fondazione_con_il_sud/bandi` can be accessed
- Requires authenticated session

---

## Data Flow

### Knowledge Base Query Flow

```
1. User asks "Quali bandi sono disponibili?"
         │
         ▼
2. Agent calls fondazioneBandi({ mode: "list" })
         │
         ▼
3. Tool scans bandi directories
   - Extracts metadata from each bando.md
   - Returns list with id, title, status, deadline
         │
         ▼
4. Agent presents list to user
         │
         ▼
5. User selects "Sport e Periferie"
         │
         ▼
6. Agent calls fondazioneBandi({ mode: "load", bandoId: "sport" })
         │
         ▼
7. Tool loads full bando content
         │
         ▼
8. Agent answers questions using bando content
```

### Semantic Search Flow

```
1. User asks "Come posso candidarmi?"
         │
         ▼
2. Agent calls catalog({ queries: ["procedura candidatura", "requisiti"] })
         │
         ▼
3. Tool generates embeddings for queries
         │
         ▼
4. pgvector finds most similar chunks
         │
         ▼
5. Tool returns relevant snippets with scores
         │
         ▼
6. Agent synthesizes answer from snippets
```

---

## File Structure

```
mastra/
├── agents/
│   ├── fondazione_con_il_sud/
│   │   ├── asse/
│   │   │   ├── index.ts           # Public-facing Fondazione agent
│   │   │   └── system-prompt.ts   # Italian system prompt
│   │   └── assi/
│   │       ├── index.ts           # Internal Fondazione agent
│   │       └── system-prompt.ts   # Italian system prompt with document tools
│   ├── research-agent/
│   │   └── index.ts           # Research agent
│   └── index.ts               # Agent exports
├── knowledgebase/
│   └── fondazione_con_il_sud/
│       ├── chairos.md         # Chairos operational manual
│       ├── website_kb.md      # Scraped website content
│       └── bandi/
│           └── <category>/    # Category subdirectories
│               └── *.md       # Bandi markdown files
├── tools/
│   ├── index.ts               # Tool exports
│   ├── fondazione-bandi-tool.ts  # Bandi list/load tool
│   ├── fondazione-fs-tool.ts     # FS browser tool
│   ├── catalog-tool.ts           # Semantic search tool
│   └── ...                    # Other tools
├── utils/
│   ├── fondazione-kb-loader.ts   # Fondazione KB utilities
│   ├── fondazione-fs-loader.ts   # FS browser utilities
│   ├── catalog-config.ts         # Catalog configuration
│   ├── catalog-ingest.ts         # Ingestion utility
│   └── runtime-utils.ts          # Runtime context
├── vectors/
│   ├── embedder.ts            # Embedding model config
│   └── pgvector.ts            # pgvector store config
├── scripts/
│   └── ingest-fondazione-catalog.ts  # Catalog ingestion script
└── index.ts                   # Mastra instance

app/
├── (chat)/
│   └── api/
│       ├── chat/
│       │   └── route.ts       # Main chat endpoint
│       └── fondazione/
│           └── fs/
│               └── route.ts   # Fondazione FS browser API

components/
├── artifacts/
│   ├── document.tsx           # Document artifacts (text, code, sheet)
│   ├── fondazione-browser.tsx # Fondazione file browser widget
│   ├── markdown-viewer.tsx    # Rich markdown viewer
│   └── index.ts               # Artifact exports and types
├── chat/
│   ├── canvas.tsx             # Resizable canvas layout
│   ├── canvas-tabs.tsx        # Tab bar component
│   └── agent-selector.tsx     # Agent selection UI
└── tools/
    └── fondazione-browser.tsx # Fondazione browser tool component
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

### Adding New Bandi

1. Create a new directory in `mastra/knowledgebase/fondazione_con_il_sud/bandi/`
2. Add `bando.md` with frontmatter:

```markdown
---
title: "Nome del Bando"
status: "aperto"
deadline: "2025-12-31"
shortDescription: "Breve descrizione del bando"
---

# Nome del Bando

Contenuto completo del bando...
```

3. Bando will be automatically discovered by `listBandiMetadata()`

### Adding to Catalog

1. Add file path to `mastra/utils/catalog-config.ts`:

```typescript
export const FONDAZIONE_CATALOG: CatalogDefinition = {
  sources: [
    ...existing,
    { id: "new-doc", filePath: path.join(process.cwd(), "path/to/doc.md") },
  ],
};
```

2. Run ingestion: `pnpm catalog:ingest:fondazione`

---

## Canvas Tab System

The canvas panel (right side of the application) supports a multi-tab system that allows users to work with multiple documents and widgets simultaneously.

### Widget Kinds

| Kind | Label | Multiple Allowed | Streaming | Icon |
|------|-------|------------------|-----------|------|
| `text` | Documento di testo | Yes | Yes | FileText |
| `code` | Codice | Yes | Yes | Code2 |
| `sheet` | Foglio di calcolo | Yes | Yes | FileSpreadsheet |
| `image` | Immagine | Yes | No | Image |
| `markdown-viewer` | Visualizzatore Markdown | Yes | No | BookOpenText |
| `document-selector` | Selettore documenti | No | No | LayoutGrid |
| `fondazione-browser` | Esplora Documenti | No | No | FolderOpen |

### Visible Content Store

Complex widgets (like Fondazione Browser) may display content that differs from the tab's artifact content. The **Visible Content Store** allows widgets to register what the user is actually viewing, making this information available to the agent.

**Location**: `lib/canvas/visible-content-store.ts`

```typescript
type VisibleContent = {
  title: string;              // Displayed content title (e.g., filename)
  description?: string;       // Path or additional context
  content: string;            // The actual content being viewed
  contentType?: "markdown" | "text" | "csv" | "json";
};
```

---

## Troubleshooting

### Common Issues

#### Catalog Search Returns No Results

**Check**:
1. Catalog has been ingested: `pnpm catalog:ingest:fondazione`
2. `POSTGRES_URL` environment variable is set correctly
3. pgvector extension is enabled in PostgreSQL

#### Fondazione Browser Not Loading

**Check**:
1. `mastra/knowledgebase/fondazione_con_il_sud/bandi/` directory exists
2. User is authenticated (API requires session)
3. Check browser console for API errors

### Debug Logging

Console logs prefixed with `[Fondazione]`:

```
[Fondazione] Listing bandi from: /path/to/bandi
[Fondazione] Loaded bando: sport_e_periferie
[Fondazione] Error loading file: <error details>
```

---

## Temporary Testing Configuration

### Rate Limiting Disabled

**File**: `lib/ai/entitlements.ts`

Rate limiting has been **temporarily disabled** for testing purposes. Both guest and regular users now have unlimited message requests.

---

## Related Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Next.js Documentation](https://nextjs.org/docs)
