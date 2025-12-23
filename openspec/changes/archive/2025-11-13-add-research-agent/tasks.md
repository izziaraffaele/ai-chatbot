# Implementation Tasks

## 1. Research Agent Implementation

- [x] 1.1 Create `mastra/agents/research-agent/system-prompt.ts` with research-optimized instructions
  - Include guidance for search query formulation
  - Include instructions for result synthesis and report generation
  - Include explicit hallucination prevention language
  - Reference design.md decisions for scope and behavior

- [x] 1.2 Create `mastra/agents/research-agent/index.ts` with research agent configuration
  - Import Google search tool from `@ai-sdk/google`
  - Configure agent with system prompt
  - Enable memory using LibSQL storage (consistent with chat agent)
  - Set default model to `openai/gpt-4.1`
  - Document that this is for agent-to-agent use only (JSDoc comment)

- [x] 1.3 Export research agent from `mastra/agents/index.ts`
  - Import `researchAgent` from `./research-agent`
  - Add to `mastraAgents` object
  - Add `RESEARCH_AGENT: 'researchAgent'` to `AGENT_NAMES` enum
  - Ensure type exports are correct (InferUITools for research agent)

## 2. Verification & Testing

- [x] 2.1 Verify TypeScript compilation
  - Run `pnpm build` and confirm no type errors
  - Confirm agent is properly typed with Zod schemas

- [x] 2.2 Verify agent registration
  - Confirm `researchAgent` is accessible from `@/mastra` exports
  - Confirm agent appears in Mastra instance agents object
  - Verify both `chatAgent` and `researchAgent` are available

- [x] 2.3 Manual testing of research agent
  - Create a simple test script that instantiates research agent
  - Execute a test query (e.g., "latest AI research trends")
  - Verify search tool is called and results are synthesized
  - Verify output is a coherent narrative report (not raw search results)
  - Verify memory context is maintained across queries

## 3. Code Quality & Documentation

- [x] 3.1 Ensure code passes linting
  - Run `pnpm lint` and fix any issues
  - Run `pnpm format` to auto-fix formatting

- [x] 3.2 Add JSDoc comments
  - Document research agent purpose: "For agent-to-agent use, not direct user calls"
  - Document Google search tool integration
  - Document memory behavior and session isolation

- [x] 3.3 Update spec documentation (reflected in requirement changes)
  - Verify `openspec/specs/mastra-agent-integration/spec.md` captures all research agent behaviors
  - Ensure scenarios match implementation

## 4. Validation & Sign-Off

- [x] 4.1 Validate OpenSpec compliance
  - Run `openspec validate add-research-agent --strict`
  - Resolve any validation errors

- [x] 4.2 Confirm backward compatibility
  - Verify chat agent still works unchanged
  - Verify no breaking changes to existing exports
  - Run existing E2E tests to confirm no regressions

- [x] 4.3 Documentation review
  - Verify proposal.md, design.md, and tasks.md are clear
  - Confirm implementation matches all requirements in spec.md
  - All scenarios are satisfied

## Deliverables

- ✓ `mastra/agents/research-agent/index.ts` - Research agent configuration
- ✓ `mastra/agents/research-agent/system-prompt.ts` - Research-optimized system prompt
- ✓ Updated `mastra/agents/index.ts` - Agent registration and exports
- ✓ Updated `openspec/specs/mastra-agent-integration/spec.md` - Research agent requirements
- ✓ All code passes linting, formatting, and TypeScript checks
- ✓ Research agent available in agent network for multi-agent use
