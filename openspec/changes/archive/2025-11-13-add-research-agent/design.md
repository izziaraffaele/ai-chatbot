# Research Agent Design

## Context

The agent network is expanding beyond a single chat agent. To enable multi-agent collaboration and information gathering, we need a specialized research agent that can execute web searches via Google's native search tool and synthesize results into actionable reports.

Current state:
- Chat agent uses custom tools (weather, document creation, suggestions)
- All agents use Mastra 0.3+ with memory and model override capability
- System prompts are built dynamically with runtime configuration
- Tools receive injected context (session, dataStream)

## Goals

- Enable web search capability in the agent network
- Create a reusable research agent for agent-to-agent use
- Leverage Google's native search tool without custom wrappers
- Follow existing patterns for consistency (memory, system prompt design, model flexibility)
- Keep research agent independent from chat agent (no coupling)

## Non-Goals

- Direct user-facing research UI (handled by agent orchestration layer)
- Custom search result formatting (delegate to agent's instructions)
- Search result caching (Google handles rate limiting)
- SEO/ranking optimization

## Decisions

### 1. Google Search Tool vs. Custom Integration
**Decision:** Use `@ai-sdk/google`'s native `googleSearch()` directly without wrapper.

**Rationale:**
- AI SDK provides type-safe, standardized integration
- Reduces boilerplate and maintenance burden
- Consistent with existing `@ai-sdk/google` usage in project

**Alternatives considered:**
- Custom search wrapper: More control but adds complexity and maintenance overhead
- Third-party search API: Different rate limiting/costs, less integration control

### 2. Research Agent Scope
**Decision:** Single-purpose research agent focused on web search and report generation.

**Rationale:**
- Follows Unix principle: do one thing well
- Agent can be composed with other agents for complex workflows
- Clear responsibility boundary (search vs. other operations)

**Alternatives considered:**
- Hybrid agent (search + other tools): Mixes concerns, harder to reason about
- Part of chat agent: Creates tight coupling, chat agent loses focus

### 3. System Prompt Approach
**Decision:** Research-specific system prompt with instructions for query synthesis and report structure.

**Rationale:**
- Optimizes for research task (not general conversation)
- Prevents hallucination of search results
- Instructs agent when to refine searches vs. synthesize

**Key behaviors:**
- Rewrite user queries into effective search terms
- Execute multiple searches if needed to gather comprehensive context
- Structure results into clear report format
- Acknowledge limitations and cite sources

### 4. Memory Configuration
**Decision:** Enable memory with LibSQL storage (same as chat agent).

**Rationale:**
- Allows multi-turn research workflows where agent refines queries
- Maintains context of previous searches to avoid redundant queries
- Consistent with existing memory pattern
- Per-session isolation prevents cross-session data leakage

### 5. Model Selection
**Decision:** Configurable at runtime, with reasonable default (e.g., `openai/gpt-4.1`).

**Rationale:**
- Matches chat agent pattern for consistency
- Google models are optimized for web search integration
- Allows experimenting with different models (2.5-flash vs. Pro)
- Supports future model upgrades without code changes

### 6. Tool-only Mode (No createDocument, updateDocument, etc.)
**Decision:** Research agent has only the Google search tool. No artifact creation.

**Rationale:**
- Focuses research agent responsibility to information gathering
- Artifact creation handled by downstream processing
- Search results delivered as structured text, not artifacts
- Simplifies agent and prevents scope creep

**Alternative considered:**
- Multi-tool research agent: Would duplicate chat agent concerns

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Google Search API rate limiting | Monitor usage; implement circuit breaker in calling agent if needed |
| Search result hallucination | System prompt explicitly forbids making up results; prompt chains summarization carefully |
| Search tool failures | Graceful error handling in agent instructions; fallback to explicit "search unavailable" message |
| Agent gets stuck in loop | System prompt limits search iterations; timeout at orchestration layer |

## Migration Plan

This is a new, non-breaking addition. No migration needed.

- Phase 1: Create research agent and register in agent network (fully backward compatible)
- Phase 2: Integrate research agent into chat agent as a tool (future work, not in scope)
- Phase 3: Build higher-level research workflows that coordinate multiple agents (future work)

## Open Questions

None at specification time. Implementation may reveal:
- Should research agent validate search results before returning?
- What max iteration limit for multi-query searches?
- Should research agent stream results or batch at end?
  - **Answer**: Batch at end (reports are coherent narrative, not streamed chunks)
