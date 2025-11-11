# Project Context

## Purpose
An AI chatbot application template built with Next.js 15 and the Vercel AI SDK. Designed for creating production-ready conversational AI applications with features like persistent chat history, collaborative document artifacts (text, code, spreadsheets), authentication, file uploads, and multi-model support. Serves as a starting point for building AI-powered chat interfaces with modern web technologies.

## Tech Stack

### Core Framework & Runtime
- **Next.js 15** - App Router, React Server Components, Server Actions, Turbo mode
- **React 19 RC** - Latest React features with Server Components support
- **TypeScript 5.6** - Full type safety across the stack
- **pnpm 9.12** - Fast, efficient package manager

### AI & ML
- **Vercel AI SDK 5.0** - Core AI streaming and tool integration
- **AI Gateway** - Unified AI provider routing (via `@ai-sdk/gateway`)
- **xAI Grok Models** - Primary model provider via `@ai-sdk/xai`
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
- **Shiki** - Syntax highlighting
- **KaTeX** - Math rendering
- **react-data-grid** - Spreadsheet editing

### Code Quality & Testing
- **Ultracite 5.3** - Biome-based linter and formatter
- **Playwright** - E2E testing framework
- **Biome 2.2** - Fast AST-based linting engine

### Utilities
- **Zod 3.25** - Schema validation for AI tools and forms
- **nanoid** - Unique ID generation
- **date-fns** - Date manipulation
- **SWR** - Client-side data fetching
- **Vercel Analytics & OpenTelemetry** - Monitoring and observability

## Project Conventions

### Code Style
Enforced by **Ultracite** (Biome-based) with strict rules:

**Loop & Function Syntax:**
- Use `for...of` instead of `.forEach()`
- Use arrow functions instead of function expressions
- No unnecessary `else` after `return` statements

**TypeScript:**
- Use `import type` for type-only imports
- Use `export type` for type-only exports
- Never use `any` type, TypeScript enums, or namespaces
- Use `const` for immutable variables

**React Specific:**
- Always specify button `type` attribute
- Include `key` props in iterations
- Hooks must be at top level with correct dependencies
- Don't destructure props inside components
- Use `<>` instead of `<Fragment>`
- Don't define components inside components
- Use Next.js `Image` component instead of `<img>`
- Use Next.js `Metadata` instead of `<head>`

**Accessibility:**
- Label elements must have text and be associated with inputs
- Interactive elements need proper ARIA roles
- Include descriptive `alt` text for images (avoid words like "image" or "picture")
- Pair mouse events with keyboard equivalents (`onClick` with `onKeyUp`/`onKeyDown`)

**Commands:**
- `pnpm format` - Auto-fix code issues
- `pnpm lint` - Check code compliance

### Architecture Patterns

**1. AI Provider Abstraction** (`lib/ai/providers.ts`)
- Custom provider switches between real models and mocks based on environment
- Test mode: uses mock models from `lib/ai/models.mock.ts`
- Production: routes through Vercel AI Gateway to xAI models
- Model IDs: `chat-model`, `chat-model-reasoning`, `title-model`, `artifact-model`

**2. Parts-Based Message Storage**
- Messages use "parts" structure (not simple content strings)
- Schema: `Message_v2` table with `parts` and `attachments` JSON fields
- Legacy `Message` table deprecated (see migration guide at chat-sdk.dev)
- Conversion: `convertToUIMessages()` transforms DB messages to UI format

**3. Artifacts System**
- Collaborative documents (text, code, sheets, images) shown in side panel
- Created/updated via AI tools: `createDocument`, `updateDocument`, `requestSuggestions`
- Documents versioned with composite primary key: `(id, createdAt)`
- Suggestions use diff-based editing stored separately

**4. Streaming Architecture**
- Uses `createUIMessageStream` for real-time AI responses
- Optional resumable streams via Redis for reliability
- Streaming context initialized in route handler, stored globally
- Usage tracking via tokenlens library

**5. Tools System**
- Tools only active for non-reasoning models
- Available: `getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`
- Tools receive session and dataStream for real-time updates
- Reasoning model uses `<think>` tags extracted by middleware

**6. Authentication Flow**
- NextAuth v5 with custom credentials provider
- User types: "registered" (email/password) or "guest" (anonymous)
- Rate limiting: checks message count per 24 hours against entitlements
- Session managed via `auth()` helper from `app/(auth)/auth.ts`

**7. Database Layer** (`lib/db/`)
- All queries centralized in `lib/db/queries.ts`
- Schema defined in `lib/db/schema.ts` using Drizzle ORM
- Migrations auto-run on build
- Uses Neon serverless Postgres driver

**8. File Organization**
- `components/elements/` - Core message and conversation UI
- `components/ui/` - shadcn/ui primitives
- `lib/ai/` - AI provider config, prompts, tools
- `lib/db/` - Database schema, queries, migrations
- `lib/editor/` - ProseMirror document editing
- `lib/artifacts/` - Server-side artifact processing
- `app/(auth)/` - Authentication routes and API endpoints
- `app/(chat)/` - Main chat interface and chat API routes

### Testing Strategy

**Framework:** Playwright for E2E testing

**Test Environment:**
- Set `PLAYWRIGHT=True` environment variable to enable test mode
- Uses mock AI models from `lib/ai/models.mock.ts` for deterministic responses
- Mock models prevent external API calls during tests

**Test Structure:**
- Test files: `tests/e2e/` and `tests/routes/`
- Page objects pattern: `tests/pages/`
- Fixtures: `tests/fixtures.ts` handles auth and setup

**Running Tests:**
- `pnpm test` - Runs all Playwright tests with mock models

**Test Coverage:**
- Authentication flows (login, register, guest)
- Chat message creation and streaming
- Document artifact creation and editing
- File upload functionality
- Rate limiting and entitlements

### Git Workflow

**Current Branch:** `feature/new-changes`
**Main Branch:** Not explicitly set (likely `main` or `master`)

**Recent Activity:**
- Feature additions (new components, configuration)
- Bug fixes (KaTeX dependency, rendering issues)
- Incremental improvements (clipboard paste support)

**Commit Conventions:**
- Prefix with type: `feat:`, `fix:`, `docs:`, etc.
- Concise, descriptive messages
- Reference issues/PRs with `#` notation

**Branch Strategy:**
- Feature branches for new work
- PR-based workflow with reviews

## Domain Context

**Conversational AI Application:**
- Multi-turn chat conversations with AI models
- Support for streaming responses with real-time updates
- Tool calling for dynamic actions (weather, document creation, etc.)

**Document Artifacts:**
- Collaborative editing of various document types
- Version control for document changes
- Diff-based suggestions system for iterative improvements

**Model Switching:**
- Standard chat model for general conversations
- Reasoning model with `<think>` tags for complex reasoning
- Title model for generating chat titles
- Artifact model for document-specific operations

**Rate Limiting & Entitlements:**
- Guest users: limited messages per 24 hours
- Registered users: higher message limits
- Entitlement system extensible for premium tiers

**White-Label Support:**
- Configurable branding via environment variables
- Development-only branding panel for real-time preview
- Customizable app name, description, URLs, analytics

## Important Constraints

**Security:**
- Never commit `.env` files or secrets
- Password hashing required for all stored credentials
- Rate limiting enforced per user type
- OWASP top 10 awareness (XSS, SQL injection, etc.)

**Performance:**
- Database migrations run automatically on build (can slow deployments)
- Turbo mode enabled for faster development
- Redis optional but recommended for production streaming reliability

**Database:**
- Parts-based message schema required (legacy schema deprecated)
- Migrations must be generated before schema changes
- No direct schema pushes in production (use migrations)

**Testing:**
- Must use mock models in test environment
- No external AI API calls during automated tests

**Code Quality:**
- All code must pass Ultracite linting
- TypeScript strict mode enforced
- No `any` types allowed

**Deployment:**
- Designed for Vercel deployment (OIDC auto-configuration)
- Non-Vercel deployments require manual AI Gateway API key
- Environment variables required for core functionality

## External Dependencies

**Vercel Services:**
- **Vercel AI Gateway** - AI model routing and management (requires API key for non-Vercel)
- **Vercel Blob** - File upload storage (requires `BLOB_READ_WRITE_TOKEN`)
- **Vercel Analytics** - Usage analytics and monitoring
- **Vercel OpenTelemetry** - Distributed tracing

**Database:**
- **Neon PostgreSQL** - Serverless Postgres (requires `POSTGRES_URL`)

**AI Providers:**
- **xAI Grok** - Primary chat models via AI Gateway
- Extensible to other providers via AI SDK provider abstraction

**Optional Services:**
- **Redis** - Resumable stream caching (requires `REDIS_URL`)
- **Google Analytics** - Web analytics (via `NEXT_PUBLIC_GA_ID`)
- **Avatar Service** - User avatars (default: `avatar.vercel.sh`)

**Authentication:**
- **Auth.js** - Managed internally, no external auth provider required
- Extensible to OAuth providers (Google, GitHub, etc.)

**CDN & Assets:**
- Next.js built-in image optimization
- Static assets served via Vercel CDN
