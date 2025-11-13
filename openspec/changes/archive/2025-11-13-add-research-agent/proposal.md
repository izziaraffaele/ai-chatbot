# Change: Add Research Agent with Google Search Tool

## Why

The application lacks a dedicated research capability for information gathering via web search. As the agent network expands, other agents need access to current web information to answer user queries effectively. A specialized research agent leverages Google's native search tool to execute queries and synthesize results into coherent reports, enabling agent-to-agent collaboration without coupling to the chat agent.

## What Changes

- **New Agent:** Add `researchAgent` to the Mastra agent network
  - Uses `@ai-sdk/google`'s native `googleSearch()` tool
  - Specialized system prompt optimized for research and report synthesis
  - Memory support for maintaining research context across multi-step queries
  - Designed for agent-to-agent use, not direct user-facing calls

- **Agent Registration:** Export research agent from `mastra/agents/index.ts`
  - Add to `mastraAgents` object
  - Add to `AGENT_NAMES` enum for easy reference

- **Specification Update:** Extend `mastra-agent-integration` capability
  - Add new requirement documenting research agent configuration
  - Add scenarios for search execution and report generation

## Impact

- **Affected specs:** `mastra-agent-integration`
- **Affected code:**
  - New: `mastra/agents/research-agent/index.ts`
  - New: `mastra/agents/research-agent/system-prompt.ts`
  - Modified: `mastra/agents/index.ts` (agent registration)
  - Modified: `openspec/specs/mastra-agent-integration/spec.md`

- **Breaking changes:** None. This is purely additive.
- **Dependencies:** Requires `@ai-sdk/google` package (already available in project)
