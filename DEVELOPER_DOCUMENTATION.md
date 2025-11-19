# Developer Documentation

## Project Overview

Chat SDK is an AI chatbot application template built with Next.js 15 and the Vercel AI SDK. It's designed for creating production-ready conversational AI applications with features like persistent chat history, collaborative document artifacts, authentication, file uploads, and multi-model support.

## Tech Stack

### Core Framework & Runtime
- **Next.js 15** - App Router, React Server Components, Server Actions, Turbo mode
- **React 19 RC** - Latest React features with Server Components support
- **TypeScript 5.6** - Full type safety across the stack
- **pnpm 9.12** - Fast, efficient package manager

### AI & ML
- **Mastra** - Agent orchestration framework with tool integration
  - `@mastra/core` - Agent and tool definitions
  - `@mastra/client-js` - Client-side tool creation
  - `@mastra/ai-sdk` - AI SDK integration and stream transformation
  - Model resolution via Mastra (OpenAI, Google models, etc.)
- **Vercel AI SDK 5.0** - Streaming infrastructure and client-side chat
- **tokenlens** - Token usage tracking and enrichment

### Database & Storage
- **PostgreSQL** - Primary database (via Neon serverless driver)
- **Drizzle ORM 0.34** - Type-safe SQL query builder with migrations
- **Vercel Blob** - File upload storage
- **Redis** (optional) - Resumable stream caching via `resumable-stream`

### Authentication & Security
- **Auth.js (NextAuth v5)** - Authentication with custom credentials provider
- **bcrypt-ts** - Password hashing
- Rate limiting based on user entitlements

### UI & Styling
- **Tailwind CSS 4.1** - Utility-first styling
- **shadcn/ui** - Radix UI primitives with custom components
- **Framer Motion** - Animations and transitions
- **next-themes** - Dark/light mode support
- **Geist Font** - Typography

### Code Editors & Document Processing
- **ProseMirror** - Rich text editing for document artifacts
- **CodeMirror 6** - Code editor with syntax highlighting
- **Sheetjs** - Spreadsheet parsing and generation

### Code Quality & Testing
- **Ultracite** - Biome-based formatter and linter
- **Playwright** - E2E testing framework
- **Zod** - Runtime type validation

## Development Commands

### Essential Commands
```bash
pnpm dev                 # Start dev server with Turbo
pnpm build               # Run migrations then build for production
pnpm start               # Start production server
pnpm lint                # Check code with Ultracite
pnpm format              # Auto-fix code issues with Ultracite
pnpm test                # Run Playwright E2E tests
```

### Database Commands
```bash
pnpm db:migrate          # Run database migrations
pnpm db:generate         # Generate new migration from schema changes
pnpm db:studio           # Open Drizzle Studio (database GUI)
pnpm db:push             # Push schema changes directly (dev only)
pnpm db:pull             # Pull schema from database
pnpm db:check            # Check migration consistency
```

## Architecture

### Application Structure

The app uses Next.js App Router with two main route groups:

- **`app/(auth)/`** - Authentication routes (login, register) and auth API endpoints
- **`app/(chat)/`** - Main chat interface and chat-related API routes

### Key Directories

```
/Users/edo/Desktop/DemoDay/
├── app/                      # Next.js App Router pages and layouts
│   ├── (auth)/              # Authentication routes
│   └── (chat)/              # Chat interface routes
├── artifacts/               # Artifact handling (code, image, sheet, text)
├── components/              # React components
│   ├── chat/               # Chat-specific components
│   ├── elements/           # AI Elements UI primitives
│   ├── messages/           # Message display components
│   ├── tools/              # Tool UI components
│   └── ui/                 # shadcn/ui components
├── config/                  # Configuration files
│   ├── demo.ts             # Demo/branding configuration
│   └── runtime.ts          # Runtime configuration
├── hooks/                   # React hooks
├── lib/                     # Shared utilities
│   ├── ai/                 # AI-related utilities
│   ├── artifacts/          # Artifact utilities
│   ├── branding/           # Branding utilities
│   ├── db/                 # Database schema and queries
│   ├── editor/             # Editor utilities
│   └── i18n/               # Internationalization
├── mastra/                  # Mastra agent and tool definitions
│   ├── agents/             # Agent implementations
│   │   ├── chat-agent/    # General-purpose chat agent
│   │   └── research-agent/ # Web research agent
│   ├── tools/              # Server-side tool definitions
│   └── utils/              # Mastra utilities
├── openspec/                # OpenSpec change proposals
├── public/                  # Static assets
└── tests/                   # E2E tests
```

### Key Architectural Patterns

#### 1. Parts-Based Message Storage
- Messages use "parts" structure (not simple content strings)
- Schema: `Message_v2` table with `parts` and `attachments` JSON fields
- Legacy `Message` table deprecated (see migration guide at chat-sdk.dev)
- Conversion: `convertToUIMessages()` transforms DB messages to UI format

#### 2. Artifacts System
- Collaborative documents (text, code, sheets, images) shown in side panel
- Created/updated via AI tools: `createDocument`, `updateDocument`, `requestSuggestions`
- Documents versioned with composite primary key: `(id, createdAt)`
- Suggestions use diff-based editing stored separately

#### 3. Streaming Architecture
- Uses `createUIMessageStream` for real-time AI responses
- Optional resumable streams via Redis for reliability
- Streaming context initialized in route handler, stored globally
- Usage tracking via tokenlens library
- Mastra agent streams transformed to AI SDK/SSE format via `convertMastraChunkToAISDKv5`

#### 4. Agent Orchestration (Mastra)

The application uses Mastra for agent orchestration, providing a flexible framework for building AI agents with tool integration.

##### Available Agents

**Chat Agent** (`mastra/agents/chat-agent/`)
- **ID**: `chatAgent`
- **Purpose**: General-purpose conversational assistant
- **Model**: Google Gemini 2.5 Pro (default, overridable at runtime)
- **Tools**:
  - `getWeather` - Fetches current weather data
  - `createDocument` - Creates new document artifacts
  - `updateDocument` - Updates existing document artifacts
  - `requestSuggestions` - Generates suggestions for document edits
- **Agents**: Has access to Research Agent for delegation
- **Memory**: LibSQL-backed memory for conversation history
- **System Prompt**: Dynamically built from runtime config (identity, capabilities, features) with geolocation hints

**Planner Agent** (`mastra/agents/planner-agent/`)
- **ID**: `plannerAgent`
- **Purpose**: Deterministic planning agent that creates structured roadmap plans
- **Model**: OpenAI GPT-5.1 Chat (latest)
- **Domains**: Study, Travel, Teaching, Projects, Fitness, Career, Event Planning
- **Features**:
  - Creates single roadmaps with sessions and atomic tasks
  - Supports time estimation and feasibility checking
  - Respects constraints (deadlines, time budgets, no-go items, daily windows)
  - Integrates with Research Agent for external information gathering
  - Supports learning style preferences for study plans
  - Spaced repetition and review task insertion for learning
  - Multi-language support (structured output in user's language)
- **Agents**: Has access to Research Agent for gathering domain-specific information
- **Output Format**: Structured markdown with roadmaps, sessions, tasks, feasibility checks
- **Max Steps**: 30 (for complex multi-step planning)
- **System Prompt**: Dynamically built from runtime config (identity, capabilities, features) with geolocation hints

**Research Agent** (`mastra/agents/research-agent/`)
- **ID**: `researchAgent`
- **Purpose**: Specialized agent for web research and information synthesis
- **Model**: Google Gemini 2.5 Pro (default)
- **Tools**:
  - `googleSearch` - Performs web searches (server-side only)
  - `createDocument` - Creates research artifacts
  - `updateDocument` - Updates research documents
  - `requestSuggestions` - Suggests document improvements
- **Memory**: LibSQL-backed for research context
- **System Prompt**: Specialized for research tasks

##### Assistant Configuration for UI

Assistants are registered in `lib/ai/agent-config.ts` for UI selection:

```typescript
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  chatAgent: {
    id: "chatAgent",
    name: "Chat Assistant",
    description: "General-purpose assistant with document creation and weather capabilities",
    avatar: "💬",
    color: "purple",
  },
  plannerAgent: {
    id: "plannerAgent",
    name: "Planner",
    description: "Creates structured roadmaps and plans for study, travel, projects, and more",
    avatar: "🗓️",
    color: "green",
  },
  researchAgent: {
    id: "researchAgent",
    name: "Researcher",
    description: "Specializes in web research and synthesis",
    avatar: "🔍",
    color: "blue",
  },
}
```

**Internationalization Support:**

Assistant names and descriptions are translated via i18n keys in `lib/i18n/translations/`:
- English: "Chat Assistant", "Planner", "Researcher"
- Italian: "Assistente Chat", "Pianificatore", "Ricercatore"

Translation keys follow the pattern `agent.{agentId}.name` and `agent.{agentId}.description`.

##### Assistant Selector Component

The `ChatAgentSelector` component (`components/chat/agent-selector.tsx`) provides a UI for switching between assistants:
- Uses ModelSelector from AI Elements
- Displays assistant avatar, name, and description
- Disabled during streaming
- Automatically loads available assistants from `AGENT_CONFIGS`
- Supports i18n with translations for assistant names and descriptions

#### 5. Tools System

**Server-Side Tools** (`mastra/tools/`)
- `getWeather` - Weather data fetching
- `createDocument` - Document creation
- `updateDocument` - Document updates
- `requestSuggestions` - Suggestion generation
- `googleSearch` - Web search (research agent only)

**Client-Side Tools** (`lib/ai/client-tools.ts`)
- Browser-executed tools via `useClientTools()` hook
- Tools passed to agents via serialized request body (schemas only)
- Access to Web APIs: clipboard, DOM, localStorage, etc.
- Type-safe via Zod schemas and TypeScript
- Example: `copyToClipboard`

**Tool Integration**
- Tools receive session context and dataStream for real-time updates
- Tools only active for non-reasoning models
- Reasoning models use `<think>` tags extracted by middleware

#### 6. Authentication Flow
- NextAuth v5 with custom credentials provider
- User types: "registered" (email/password) or "guest" (anonymous)
- Rate limiting: checks message count per 24 hours against entitlements
- Session context available to agents via runtime context

## Configuration

### Demo Configuration (`config/demo.ts`)

The demo configuration controls branding, assistant behavior, and feature flags:

```typescript
export type DemoConfig = {
  assistant: {
    name: string;
    description: string;
    roles: string[];
    tone: string;
  };
  appearance: {
    preset: string;
    defaultMode: "auto" | "light" | "dark";
    favicon?: string;
    logo?: string;
    authLogo?: string;
    ogImage?: string;
    customCss?: string;
  };
  chat: {
    suggestions: string[];
    features: {
      webSearch: boolean;
      multimodalInput: boolean;
      memory: boolean;
      artifacts: boolean;
    };
  };
  context: {
    organization?: { name: string; description: string; websiteUrl: string };
    app?: { name: string; description: string };
    indexes: string[];
    knowledgeBase: "none" | "celio" | "analisi1" | "schoolr";
  };
  runtime: {
    experiences: Array<{ trigger: string; agent: string }>;
    intents: Array<{ pattern: string; handler: string }>;
  };
};
```

### Knowledge Base System

The application supports loading custom knowledge bases that are injected into agent system prompts. This allows agents to have specialized domain knowledge for specific use cases.

**Important**: The system now implements a permission-based flow where users must explicitly consent before agents use knowledge base content.

#### Available Knowledge Bases

Three mutually exclusive knowledge bases can be activated:

1. **Celio** - Historical and archaeological information about Colle Celio in Rome
   - File: `mastra/knoledgebase/celio/celio-knowledge-base.md`
   - Contains: 14 POIs, 70 story points, 5 narrative perspectives
   - Use case: Tourism, historical guidance, cultural information

2. **Analisi 1** - Mathematical analysis course content
   - File: `mastra/knoledgebase/uploaded_content/analisi1.md`
   - Contains: Comprehensive calculus and analysis materials
   - Use case: Education, tutoring, study assistance

3. **Schoolr** - Online tutoring platform information
   - Files: `mastra/knoledgebase/schoolr/info.md` + `personal.md`
   - Contains: Platform features, pricing, tutor information
   - Use case: Customer support, platform guidance

#### Configuration

Knowledge bases are configured in the Demo Settings UI under "Indexes" section:

- **MemorAIz** toggle - Always enabled (disabled in UI)
- **Demo Courses** toggle - Optional additional index
- **Knowledge Base** toggles - Mutually exclusive (Celio, Analisi 1, Schoolr)

When a knowledge base is selected in `config/demo.ts`:

```typescript
context: {
  knowledgeBase: "celio", // or "analisi1", "schoolr", "none"
}
```

#### Permission-Based Usage Flow

The knowledge base system follows a strict permission protocol to ensure user consent:

##### 1. Detection and Disclosure (Chat Agent)

When a knowledge base is connected and relevant to a user's request, the Chat Agent:
- Detects that `config.knowledgeBase` exists and is relevant
- Explicitly informs the user about the available knowledge base
- Example: "I see you have a knowledge base with your study materials. This could be helpful for creating your study plan."

##### 2. Permission Request (Chat Agent)

The Chat Agent asks for explicit confirmation before using the knowledge base:

**Example permission requests:**
- **Study programs/materials**: "I see you have uploaded your study program materials. Would you like me to use them to create your study plan?"
- **POI databases**: "I have a knowledge base with Points of Interest for Rome. Should I use it to plan your trip?"
- **Notes/documents**: "I see you have notes about calculus. Do you want me to use them as reference material?"

##### 3. Additional Materials (Chat Agent)

After receiving permission, the Chat Agent asks if the user wants to add more content:
- "Do you want to upload any other documents, notes, or resources before I proceed?"
- This allows users to supplement the knowledge base with additional materials

##### 4. Handle Permission Refusal (Chat Agent)

If the user declines permission:
- Chat Agent acknowledges the choice politely
- Does NOT reference or use any information from the knowledge base
- Continues using only the user's messages and general knowledge

##### 5. Use Knowledge Base (Chat Agent)

Only after explicit permission, the Chat Agent:
- Uses the knowledge base to avoid redundant questions
- Provides personalized responses based on actual user materials
- References specific content when helpful

##### 6. Pre-Authorized Usage (Planner Agent)

The Planner Agent operates differently:
- It's called by the Chat Agent after permission is already obtained
- The knowledge base is only present in its config if permission was granted
- It can use the knowledge base directly without asking again
- It structures plans around actual materials (e.g., specific chapters, POIs)

#### Implementation Flow

1. **Client Side** (`hooks/use-runtime-config.ts`):
   - Demo config's `context.knowledgeBase` is passed as `knowledgeBaseName` in runtime config
   - Sent to chat API with each message via `components/chat/context.tsx`

2. **Transport Layer** (`components/chat/context.tsx`):
   - Uses a ref (`runtimeConfigRef`) to avoid stale closure issues
   - The ref is updated via `useEffect` whenever `runtimeConfig` changes
   - `prepareSendMessagesRequest` reads from `runtimeConfigRef.current` to ensure latest config is sent
   - This ensures knowledge base changes are immediately reflected in new messages

3. **Server Side** (`app/(chat)/api/chat/route.ts`):
   - Knowledge base is loaded from filesystem using `loadKnowledgeBase()`
   - Content is injected into `runtimeConfig.knowledgeBase` object
   - Passed to agents via runtime context

4. **Agent System Prompts**:
   
   **Chat Agent** (`mastra/agents/chat-agent/system-prompt.ts`):
   - Implements comprehensive permission protocol (see above)
   - Must detect relevance, request permission, ask about additional materials
   - Only uses knowledge base after explicit consent
   - Handles refusal gracefully by not using the content
   
   **Planner Agent** (`mastra/agents/planner-agent/system-prompt.ts`):
   - Assumes permission is already granted (called by Chat Agent)
   - Uses knowledge base directly without asking permission again
   - Structures plans based on actual content in the knowledge base
   - References specific items (chapters, POIs, materials)

#### Mutual Exclusivity Behavior

Knowledge base selection follows these rules:

- **Nothing toggled** → No extra context added to agent prompts
- **One selected** → That knowledge base content is loaded and injected
- **Second one selected** → First is automatically de-toggled, new context replaces old
  - Example: If Celio is selected, then Schoolr is toggled, Celio is de-toggled and only Schoolr content is used
  - UI state management in `components/demo-config/index.tsx` handles this via the `SwitchListControl` component

#### Adding New Knowledge Bases

To add a new knowledge base:

1. Add markdown file(s) to `mastra/knoledgebase/`
2. Update `KnowledgeBaseName` type in `mastra/utils/knowledge-base-loader.ts`
3. Add file path mapping in `KNOWLEDGE_BASE_PATHS`
4. Update demo schema enum in `config/demo.schema.ts`
5. Update runtime schema enum in `config/runtime.schema.ts`
6. Add UI toggle in `components/demo-config/index.tsx`

### Runtime Configuration (`config/runtime.ts`)

Runtime configuration provides agent-specific settings that can be accessed within agent instructions.

### Environment Variables

Key environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret key
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key
- Model-specific API keys as needed

## Testing

### E2E Tests (`tests/`)

The project uses Playwright for end-to-end testing:

```bash
pnpm test                # Run all tests
```

**Test Setup:**
- Tests use mock models (see `lib/ai/models.mock.ts`)
- Set `PLAYWRIGHT=True` env var to enable test mode
- Test fixtures in `tests/fixtures.ts`
- Page objects in `tests/pages/`

## Code Quality

### Ultracite Configuration

The project uses Ultracite (Biome-based) for code quality:

```bash
pnpm lint                # Check for issues
pnpm format              # Auto-fix issues
```

Configuration in `biome.jsonc` enforces:
- Strict accessibility standards
- Type safety best practices
- Code complexity limits
- React/JSX conventions
- No console statements in production

## Recent Changes

### Renamed "Agent" to "Assistant" in UI (November 19, 2025)

**Change**: Updated all user-facing text to use "Assistant"/"Assistente" instead of "Agent"/"Agente" for better clarity.

**Files Modified**:
- `lib/i18n/translations/en.ts` - Updated all agent-related translation keys to use "assistant"
- `lib/i18n/translations/it.ts` - Updated all agent-related translation keys to use "assistente"
- `lib/ai/agent-config.ts` - Changed "Chat Agent" to "Chat Assistant" in display names
- `components/chat/agent-selector.tsx` - Added i18n support for assistant names and descriptions
- `DEVELOPER_DOCUMENTATION.md` - Updated terminology in user-facing documentation

**Details**:
- Translation keys updated:
  - `agent.selector.search`: "Search agents..." → "Search assistants..." (EN) / "Cerca assistenti..." (IT)
  - `agent.selector.empty`: "No agents found." → "No assistants found." (EN) / "Nessun assistente trovato." (IT)
  - `agent.progress.executing`: "Executing sub-agent..." → "Executing sub-assistant..." (EN) / "Esecuzione sub-assistente..." (IT)
- Added new translation keys for assistant names:
  - `agent.chatAgent.name`: "Chat Assistant" (EN) / "Assistente Chat" (IT)
  - `agent.plannerAgent.name`: "Planner" (EN) / "Pianificatore" (IT)
  - `agent.researchAgent.name`: "Researcher" (EN) / "Ricercatore" (IT)
- Agent selector now dynamically translates assistant names and descriptions based on user language
- Comments updated to use "assistant" terminology where user-facing

**Impact**:
- Improved clarity for end users - "Assistant" is more familiar than "Agent"
- Full i18n support for assistant names in both English and Italian
- Consistent terminology across the UI
- Backend code and technical references still use "agent" terminology for consistency with Mastra framework

### Implemented Knowledge Base Permission Flow (November 19, 2025)

**Change**: Added permission-based protocol for knowledge base usage to ensure user consent.

**Files Modified**:
- `mastra/agents/chat-agent/system-prompt.ts` - Added comprehensive permission protocol
- `mastra/agents/planner-agent/system-prompt.ts` - Added note about pre-authorized usage
- `DEVELOPER_DOCUMENTATION.md` - Documented permission flow

**Details**:
- **Chat Agent** now follows a 5-step permission protocol:
  1. **Detect and Disclose**: Informs user when a relevant knowledge base is available
  2. **Request Permission**: Asks for explicit confirmation before using it
  3. **Ask About Additional Materials**: Prompts user to supplement the knowledge base
  4. **Handle Refusal**: Proceeds without using knowledge base if user declines
  5. **Use Knowledge Base**: Only uses content after explicit permission
- **Planner Agent** assumes permission is already granted (called by Chat Agent after permission obtained)
- Knowledge base content is still loaded into prompts but agents are instructed not to use it without permission
- Example permission requests provided for different scenarios (study materials, POI databases, notes)

**Impact**:
- Users maintain control over when their uploaded content is used
- Transparent about available knowledge bases
- Opportunity to add additional materials before proceeding
- Graceful handling of permission denial
- Improved user trust and privacy

### Fixed Database Error in Document Saving (November 19, 2025)

**Change**: Added input validation and default value for `kind` in document saving API and database query.

**Files Modified**:
- `app/(chat)/api/document/route.ts` - Added default `kind="text"` to POST handler
- `lib/db/queries.ts` - Added optional `kind` parameter with default value in `saveDocument`

**Details**:
- The `saveDocument` function was failing when `kind` was missing or undefined, violating the database NOT NULL constraint.
- Added validation in the API route to ensure `kind` defaults to "text" if missing.
- Added fallback in `saveDocument` query function for robustness.
- Added error logging in `saveDocument` to catch and log detailed database errors.

**Impact**:
- Prevents 500 errors when creating or saving documents with missing `kind` property.
- Improves error visibility for database operations.

### Update Chat Agent Planner Output Format (November 19, 2025)

**Change**: Updated Chat Agent's orchestration prompt to strictly enforce full roadmap presentation.

**Files Modified**:
- `mastra/agents/chat-agent/orchestration-prompt.ts` - Enhanced presentation instructions

**Details**:
- Strict requirement to show the FULL roadmap with ALL sessions and tasks
- Enforced specific markdown structure: Sessions Table followed by individual Session subsections with their own Task Tables
- Prevented summarization or omission of tasks

**Impact**:
- Ensures users receive the complete, detailed plan generated by the Planner Agent
- Improves readability and structure of complex plans

### Updated Planner Agent System Prompt with Runtime Configuration (November 18, 2025)

**Change**: Modified the Planner Agent system prompt to use runtime configuration, matching the Chat Agent's approach

**Files Modified**:
- `mastra/agents/planner-agent/system-prompt.ts` - Converted static `PLANNER_SYSTEM_PROMPT` constant to `plannerAgentSystemPrompt()` function
- `mastra/agents/planner-agent/index.ts` - Updated to use dynamic instructions with runtime context
- `DEVELOPER_DOCUMENTATION.md` - Updated Planner Agent documentation

**Details**:
- Planner Agent now dynamically builds its system prompt from runtime configuration
- Incorporates identity, organization info, assistant description, tone, and guidelines from config
- Includes environment context (site/app details) when available
- Supports geolocation hints for location-relevant planning (especially useful for travel plans)
- Lists available features (web search, memory) in the prompt
- Shows available experiences/roles when configured
- Adds organization context and custom instructions from runtime config
- Maintains all existing planning-specific instructions and workflows
- System prompt structure now mirrors Chat Agent's approach for consistency

**Impact**:
- Planner Agent can now be customized per tenant/deployment through runtime configuration
- Supports white-label scenarios with custom branding and identity
- Provides consistent user experience across Chat and Planner agents
- Geolocation context improves travel planning recommendations
- Better adaptability to different organizational contexts and requirements

### Added Planner Agent to UI (November 18, 2025)

**Change**: Added the Planner Agent to the agent selector UI

**Files Modified**:
- `mastra/agents/index.ts` - Exported `plannerAgent` and added types
- `lib/ai/agent-config.ts` - Added `plannerAgent` to `AGENT_CONFIGS`
- `DEVELOPER_DOCUMENTATION.md` - Documented Planner Agent capabilities

**Details**:
- Planner Agent is now selectable in the UI alongside Chat and Research agents
- Specialized in creating structured roadmap plans across multiple domains
- Supports study plans, travel itineraries, teaching curricula, project timelines, fitness programs
- Uses GPT-5.1 with up to 30 steps for complex planning workflows
- Can delegate to Research Agent for domain-specific information gathering

**Impact**:
- Users can now request structured plans and roadmaps
- Planner Agent provides deterministic planning with feasibility checking
- Supports time estimation, constraint handling, and multi-language output

### Added Chat Agent to UI (November 18, 2025)

**Change**: Added the Chat Agent to the agent selector UI

**Files Modified**:
- `lib/ai/agent-config.ts` - Added `chatAgent` to `AGENT_CONFIGS`

**Details**:
- Chat Agent is now selectable in the UI alongside other agents
- Users can switch between agents using the agent selector dropdown
- Chat Agent appears first as the default/general-purpose option
- Fixed fallback in `getDefaultAgent()` from non-existent `AGENT_CONFIGS.research` to `AGENT_CONFIGS.chatAgent`

**Impact**:
- Users can now choose between specialized agents for different tasks
- Chat Agent provides general assistance with document creation and weather
- All three agents (Chat, Planner, Research) are now available in the UI

## Best Practices

### Adding New Agents

1. Create agent directory in `mastra/agents/[agent-name]/`
2. Define agent with system prompt and tools
3. Export agent from `mastra/agents/index.ts`
4. Add agent configuration to `lib/ai/agent-config.ts`
5. Agent automatically appears in UI selector

### Adding New Tools

**Server-Side Tools:**
1. Create tool file in `mastra/tools/[tool-name].ts`
2. Define tool with Zod schema and execute function
3. Export tool from `mastra/tools/index.ts`
4. Register tool with agent(s) in agent definition
5. Optionally add UI component in `components/tools/`

**Client-Side Tools:**
1. Define tool in `lib/ai/client-tools.ts`
2. Use `createClientTool()` from `@mastra/client-js`
3. Register in client tools registry
4. Pass to agent via `useClientTools()` hook

### Database Migrations

1. Update schema in `lib/db/schema.ts`
2. Generate migration: `pnpm db:generate`
3. Review migration SQL in `lib/db/migrations/`
4. Apply migration: `pnpm db:migrate`
5. Test with `pnpm db:studio`

### Styling Conventions

- Use Tailwind utility classes
- Follow shadcn/ui patterns for components
- Maintain dark mode compatibility
- Use CSS variables for theme colors
- Prefer composition over custom CSS

## Troubleshooting

### Common Issues

**Build Errors:**
- Run `pnpm db:migrate` before building
- Ensure all environment variables are set
- Check TypeScript errors with `pnpm build`

**Database Issues:**
- Verify `DATABASE_URL` is correct
- Run migrations: `pnpm db:migrate`
- Check schema: `pnpm db:studio`

**AI/Model Issues:**
- Verify API keys are set
- Check model availability in `lib/ai/models.ts`
- Review agent configuration in `mastra/agents/`

**Styling Issues:**
- Clear `.next` cache
- Rebuild: `pnpm build`
- Check Tailwind configuration

## Resources

- **Documentation**: https://chat-sdk.dev
- **AI SDK Docs**: https://ai-sdk.dev
- **Mastra Docs**: https://mastra.ai
- **Next.js Docs**: https://nextjs.org/docs
- **Drizzle ORM**: https://orm.drizzle.team

## Contributing

When making changes:
1. Follow the code quality rules in workspace settings
2. Update this documentation with significant changes
3. Add tests for new features
4. Run `pnpm format` before committing
5. Ensure all tests pass: `pnpm test`
6. Create change proposals for significant features (see `openspec/AGENTS.md`)

