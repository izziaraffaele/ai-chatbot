# Design: Mastra Agents for Artifact Generation

## Context

The chat endpoint has been successfully migrated to Mastra agents, providing a unified abstraction for AI operations. The artifacts system still uses AI SDK's `streamObject` directly, creating inconsistency and duplicating agent configuration logic. This refactoring unifies the artifact generation pipeline with the Mastra agent framework.

## Goals

- Unify artifact generation to use Mastra agents (consistency with chat endpoint)
- Maintain event-based streaming through the existing `dataStream` writer
- Preserve document handler interface (no breaking changes)
- Enable future extensibility (shared plugins, memory, logging across chat and artifacts)

## Non-Goals

- Changing the document storage schema or API contracts
- Modifying the dataStream event format consumed by the client
- Altering the artifact kinds (text, code, sheet remain unchanged)
- Implementing artifact memory or inter-artifact communication

## Decisions

### Decision: Internal Agent Creation in createDocumentHandler

**What**: Each call to `createDocumentHandler` creates an internal Mastra agent instance specific to that document kind.

**Why**:
- Encapsulates agent creation logic within the handler factory
- Each artifact type (text, code, sheet) can have specialized agent prompts and configurations
- Keeps the public API unchanged (handlers still take config with onCreateDocument/onUpdateDocument)
- Agents are not exposed to callers; they're implementation details

**Alternatives Considered**:
1. Pass agents from outside (chat route) - Would require changing artifact API, more coupling
2. Single global artifact agent - Would be difficult to optimize prompts per document type
3. Keep AI SDK streamObject - Maintains inconsistency, blocks future Mastra-specific features

### Decision: Unified textStream Consumption for All Artifacts

**What**: Consume the Mastra agent's `.stream().textStream` for all artifact types (text, code, sheet).

**Why**:
- Code artifacts generate code as text (not structured objects)
- Sheet artifacts generate CSV as text (not structured objects)
- Text artifacts generate narrative as text
- All three types fundamentally output text, so a unified streaming approach simplifies the code
- Removes the need for Zod schemas and `streamObject` overhead
- Validation responsibility moves to agent prompts and system instructions
- Cleaner, more maintainable code path with fewer conditional branches

**Alternatives Considered**:
1. Keep `streamObject` for code/sheet - Adds unnecessary complexity since output is text anyway
2. Use `.objectStream` for code/sheet - Would require schema definitions, more boilerplate
3. Different streaming methods per type - Defeats the purpose of unification

### Decision: Model Configuration Per Document Handler

**What**: The `createDocumentHandler` config accepts an optional `model` parameter to specify which language model to use for that artifact type. If not provided, defaults to 'artifact-model'.

```typescript
export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  model: 'openai/gpt-4.1', // optional, per-handler model selection
  onCreateDocument: async ({ agent, ... }) => { ... },
  onUpdateDocument: async ({ agent, ... }) => { ... },
});
```

**Why**:
- Allows per-artifact-type model optimization (code generation may benefit from different model than text)
- Maintains backward compatibility (defaults to 'artifact-model')
- Makes it easy to A/B test different models per document type
- Aligns with how the document-specific system prompts are already configured
- Removes hardcoded model selection from createDocumentHandler

### Decision: Agent Configuration Per Document Type

**What**: Each document type (text, code, sheet) has its own specialized agent configuration with:
- Document-specific system prompt (e.g., "You are an expert code writer")
- Model selection from handler config or default to 'artifact-model'
- Tool configuration (disabled for document generation agents)

**Why**:
- Optimizes prompts for document-specific tasks
- Aligns with existing prompt structure in `lib/ai/prompts.ts`
- Easier to maintain and test per-type configurations
- Future-proof for type-specific features
- Model selection is flexibly configurable per handler

### Decision: No Changes to Document Handler Interface

**What**: The public `DocumentHandler` type and `createDocumentHandler` function signature remain unchanged. The `agent` parameter in callbacks is optional and internal.

**Why**:
- Backward compatible if anyone is using these types
- Keeps the API simple and focused on the handler's true responsibility
- Agents are implementation detail, not part of the contract

### Decision: Event Emission via dataStream.write()

**What**: For each chunk received from the agent stream, emit a corresponding dataStream event (e.g., `data-codeDelta`, `data-textDelta`, `data-sheetDelta`).

**Why**:
- Consistent with existing dataStream event format
- Allows the client to display incremental updates
- Decouples agent streaming from client-side rendering
- Maintains the transient flag behavior for transient updates

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking dataStream event format | No format changes; only source of events changes from `streamObject` to agent.stream() |
| Agent configuration bugs per type | Start with text (simplest), test thoroughly before code/sheet |
| Token usage tracking incompatibility | Use same token tracking approach as chat endpoint; ensure agents emit usage data |
| Stream consumption errors | Add error handling in stream consumption loops; log errors to help debugging |
| Performance degradation | Profile streaming latency before/after; optimize agent prompts if needed |

## Migration Plan

1. **Phase 1**: Refactor type definitions and update createDocumentHandler with agent creation
2. **Phase 2**: Implement text artifact agent stream consumption (simplest case, validates approach)
3. **Phase 3**: Implement code artifact agent stream consumption (validates objectStream handling)
4. **Phase 4**: Implement sheet artifact agent stream consumption
5. **Phase 5**: E2E testing and validation across all artifact types
6. **Phase 6**: Code cleanup, linting, documentation

## Open Questions

1. Should artifact agents have access to tools (unlikely, but consider for future extensibility)?
2. Should we add memory management to artifact agents (e.g., version history context)?
3. How should we handle agent errors during document generation (graceful fallback vs. user-facing error)?
4. Should token usage be tracked separately for artifact generation vs. chat?
