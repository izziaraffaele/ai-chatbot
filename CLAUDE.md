# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI chatbot application built with Next.js 15 and the AI SDK. It's a template for creating conversational AI applications with features like chat history, document artifacts, authentication, and multi-model support.

**Tech Stack:**

- **Framework:** Next.js 15 (App Router, React Server Components, Server Actions)
- **AI:** Vercel AI SDK with xAI Grok models via AI Gateway
- **Database:** PostgreSQL (Neon) with Drizzle ORM
- **Storage:** Vercel Blob (file uploads)
- **Cache:** Redis (optional, for resumable streams)
- **Auth:** Auth.js (NextAuth v5)
- **Styling:** Tailwind CSS with shadcn/ui components
- **Code Quality:** Ultracite (Biome-based formatter and linter)
- **Testing:** Playwright for E2E tests
- **Package Manager:** pnpm

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

### Testing

```bash
pnpm test                # Run all Playwright tests
# Note: Tests use mock models (see lib/ai/models.mock.ts)
# Set PLAYWRIGHT=True env var to enable test mode
```

## Architecture

### Application Structure

The app uses Next.js App Router with two main route groups:

- **`app/(auth)/`** - Authentication routes (login, register) and auth API endpoints
- **`app/(chat)/`** - Main chat interface and chat-related API routes

### Key Architectural Patterns

**1. AI Provider Abstraction (`lib/ai/providers.ts`)**

- Uses a custom provider that switches between real models and mocks based on environment
- In test mode: uses mock models from `lib/ai/models.mock.ts`
- In production: routes through Vercel AI Gateway to xAI models
- Models are defined by ID: `chat-model`, `chat-model-reasoning`, `title-model`, `artifact-model`

**2. Message Storage (Parts-based Schema)**

- Messages use a "parts" structure (not simple content strings)
- Schema: `Message_v2` table with `parts` and `attachments` JSON fields
- Legacy `Message` table is deprecated (see migration guide at chat-sdk.dev)
- Conversion: `convertToUIMessages()` transforms DB messages to UI format

**3. Artifacts System**

- Artifacts are collaborative documents (text, code, sheets, images) shown in a side panel
- Created/updated via AI tools: `createDocument`, `updateDocument`, `requestSuggestions`
- Documents are versioned with composite primary key: `(id, createdAt)`
- Suggestions use diff-based editing stored separately

**4. Streaming Architecture**

- Uses `createUIMessageStream` for real-time AI responses
- Optional resumable streams via Redis (see `resumable-stream` package)
- Streaming context initialized in route handler, stored globally
- Usage tracking via tokenlens library (enriches token usage data)

**5. Tools System**

- Tools are only active for non-reasoning models
- Available tools: `getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`
- Tools receive session and dataStream for real-time updates
- Reasoning model (`chat-model-reasoning`) uses `<think>` tags extracted by middleware

**5a. Assistant Actions Registry (Client-Side Tools)**

- Client-side tools are called "assistant actions" from developer perspective
- Dynamic registry in `lib/ai/client-tools.ts` maintains all registered actions
- Registry starts empty; actions are registered from React components via `useAssistantAction()` hook
- Actions are deregistered when their component unmounts (lifecycle-aware)
- `useClientTools()` hook provides access to registry with `register()`, `deregister()`, `getTools()` methods
- `clearAssistantActionsRegistry()` available for testing (clears all registered actions)

**6. Authentication Flow**

- NextAuth v5 with custom credentials provider
- User types: "registered" (email/password) or "guest" (anonymous)
- Rate limiting: checks message count per 24 hours against entitlements
- Session managed via `auth()` helper from `app/(auth)/auth.ts`

**7. Database Layer (`lib/db/`)**

- All queries centralized in `lib/db/queries.ts`
- Schema defined in `lib/db/schema.ts` using Drizzle ORM
- Migrations auto-run on build (see `build` script)
- Uses Neon serverless Postgres driver

### File Organization Patterns

**Components:**

- `components/elements/` - Core message and conversation UI elements
- `components/ui/` - shadcn/ui primitives
- `components/demo-config/` - Branding configuration panel (dev only)
- Top-level components handle complex features (chat, artifacts, editors)

**Library Code:**

- `lib/ai/` - AI provider configuration, prompts, tools, entitlements
- `lib/db/` - Database schema, queries, migrations
- `lib/editor/` - Document editing logic (ProseMirror-based)
- `lib/artifacts/` - Server-side artifact processing
- `lib/types.ts` - Shared TypeScript types
- `lib/utils.ts` - Utility functions (includes message conversion)

**API Routes:**

- `app/(chat)/api/chat/route.ts` - Main chat endpoint (POST = stream, DELETE = remove)
- `app/(chat)/api/document/route.ts` - Document CRUD
- `app/(chat)/api/suggestions/route.ts` - Suggestion management
- `app/(auth)/api/auth/` - NextAuth endpoints

### Internationalization (i18n)

**7. Client-Side Translation System (`lib/i18n/`)**

The application supports multiple languages through a client-side translation system:

- **Translation files:** JSON/TypeScript files in `lib/i18n/translations/`
  - `en.ts` - English translations (source of truth)
  - `it.ts` - Italian translations (must match en.ts structure)
- **Translation hook:** `useTranslations()` provides access to translations in components
- **Language persistence:** Cookie-based (`locale` cookie) with 1-year expiration
- **Dynamic loading:** Translation files loaded on-demand based on user preference

**Usage in Components:**

```typescript
import { useTranslations } from "@/lib/i18n/use-translations";

function MyComponent() {
  const t = useTranslations();

  return (
    <button>
      {t("common.save", "Save")} {/* Key with fallback */}
    </button>
  );
}
```

**Language Configuration:**

- `NEXT_PUBLIC_DEFAULT_LOCALE` - Default language (defaults to "en")
- `NEXT_PUBLIC_SUPPORTED_LOCALES` - Comma-separated supported languages (defaults to "en,it")
- Language switcher available in settings/user navigation menu

**Adding New Languages:**

1. Create new translation file: `lib/i18n/translations/[locale].ts`
2. Add locale to `NEXT_PUBLIC_SUPPORTED_LOCALES` environment variable
3. Update `Locale` type in `lib/i18n/types.ts`
4. Add language name to `LANGUAGE_NAMES` in `lib/i18n/utils.ts`
5. Update `loadTranslations()` function in `lib/i18n/utils.ts`

## Code Quality Standards

This project uses **Ultracite** (Biome-based) for linting and formatting. Key rules from `.cursor/rules/ultracite.mdc`:

**Critical Patterns:**

- Always use `for...of` instead of `.forEach()`
- Use arrow functions instead of function expressions
- Use `import type` for type-only imports and `export type` for type-only exports
- Never use `any` type, TypeScript enums, or namespaces
- Use `const` for variables that don't change
- Always specify button `type` attribute
- Include `key` props in iterations
- React hooks must be at top level with correct dependencies

**Accessibility Requirements:**

- Label elements must have text and be associated with inputs
- Interactive elements need proper ARIA roles
- Include `alt` text for images (but don't use words like "image" or "picture")
- Button elements require explicit `type` attribute
- Pair mouse events with keyboard equivalents (`onClick` with `onKeyUp`/`onKeyDown`)

**React/Next.js Specific:**

- Don't use `<img>` tags (use Next.js `Image` component)
- Don't use `<head>` tags (use Next.js `Metadata`)
- Don't destructure props inside components
- Use `<>` instead of `<Fragment>`
- Don't define components inside components

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Essential variables:
   - `AUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `POSTGRES_URL` - PostgreSQL connection string
   - `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
   - `AI_GATEWAY_API_KEY` - Required for non-Vercel deployments (Vercel uses OIDC)
3. Optional:
   - `REDIS_URL` - Enables resumable streams
   - Branding variables (`NEXT_PUBLIC_*`) - Configure app identity
   - Internationalization variables (`NEXT_PUBLIC_*_LOCALE`) - Configure language settings

## Common Patterns

### Adding a New AI Tool

1. Create tool file in `lib/ai/tools/`
2. Define Zod schema for parameters
3. Implement tool function with `execute` handler
4. Add to tools object in `app/(chat)/api/chat/route.ts`
5. Add tool name to `experimental_activeTools` array
6. Update system prompt in `lib/ai/prompts.ts` if needed

### Registering Assistant Actions from Components

Assistant actions (client-side tools) can be dynamically registered from React components using the `useAssistantAction()` hook:

```typescript
import { useAssistantAction } from '@/hooks/use-assistant-action';
import { createTool } from '@mastra/client-js';
import { z } from 'zod';

function MyComponent() {
  // Define the action
  const myAction = createTool({
    id: 'myAction',
    description: 'My custom assistant action',
    inputSchema: z.object({
      input: z.string().describe('Some input'),
    }),
    execute: async ({ context }) => {
      return { result: `Processed: ${context.input}` };
    },
  });

  // Register the action - automatically deregisters on unmount
  useAssistantAction(myAction);

  return <div>Component with custom action</div>;
}
```

**Key Points:**

- Actions are registered when the component mounts and deregistered when it unmounts
- The hook handles lifecycle automatically via `useEffect`
- Multiple components can each register their own actions
- Actions won't be available until after component mount (available in next chat message)
- For manual registry access, use `useClientTools()` to get the registry object with `register()`, `deregister()`, and `getTools()` methods

### Database Schema Changes

1. Modify `lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Review generated SQL in `lib/db/migrations/`
4. Run `pnpm db:migrate` to apply locally
5. Migrations run automatically on deployment

### Adding New Message Part Types

- Messages use `parts` array (see AI SDK docs)
- Conversion logic in `lib/utils.ts` (`convertToUIMessages`)
- UI rendering in `components/message.tsx` and `components/elements/`

## Testing Strategy

- E2E tests use Playwright with mock AI models
- Test files in `tests/e2e/` and `tests/routes/`
- Page objects pattern: `tests/pages/`
- Fixtures in `tests/fixtures.ts` handle auth and setup
- Mock models in `lib/ai/models.mock.ts` provide deterministic responses

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

- [AI Elements](https://www.npmjs.com/package/ai-elements) is a component library and custom registry built on top of shadcn/ui to help you build AI-native applications faster. It provides pre-built components like conversations, messages and more.

It's a library provided by Vercel and it's fully integrated with AI SDK.
[Documentation](https://ai-sdk.dev/elements) | [Repository](https://github.com/vercel/ai-elements)

- AI Elements components are installed in `@/components/elements/*`. You should use them following the same usage rules you apply to normal shadcn components (do not override them, use it to create more complex compositions).
