## ADDED Requirements

### Requirement: Research Agent Configuration
The system SHALL provide a Mastra research agent configured with Google search capability, system prompt for report synthesis, and memory management for multi-turn research workflows.

#### Scenario: Research agent is available in agent network
- **WHEN** the Mastra instance is initialized
- **THEN** the research agent SHALL be registered in the agents object
- **AND** SHALL be accessible via `mastra.agents.researchAgent`
- **AND** SHALL be importable via `import { researchAgent } from '@/mastra'`

#### Scenario: Research agent executes web search
- **WHEN** a caller invokes the research agent with a query
- **THEN** the agent SHALL use the Google search tool to find relevant web results
- **AND** the agent SHALL translate the query into effective search terms if needed
- **AND** the agent SHALL execute one or more searches to gather comprehensive information
- **AND** the agent SHALL synthesize search results into a structured report

#### Scenario: Research agent generates synthesis report
- **WHEN** search results are collected
- **THEN** the agent SHALL synthesize results into a coherent narrative report
- **AND** the report SHALL acknowledge sources and limitations
- **AND** the report SHALL be streamed to the caller for real-time feedback
- **AND** the agent SHALL NOT hallucinate or invent search results

#### Scenario: Research agent maintains context across queries
- **WHEN** multiple search queries are submitted to the same agent instance
- **THEN** the agent SHALL maintain conversation history using memory storage
- **AND** the agent SHALL reference previous search results when relevant
- **AND** the agent SHALL avoid redundant searches for the same topic
- **AND** memory SHALL be isolated per research session

#### Scenario: Research agent uses configurable model
- **WHEN** the research agent is instantiated
- **THEN** the model SHALL be configurable at runtime
- **AND** SHALL default to `google/gemini-2.5-flash` or a semantically equivalent Google model
- **AND** the model override SHALL be passed at agent invocation time
- **AND** allows experimenting with different model variants (e.g., Pro for complex research)

#### Scenario: Research agent handles search failures gracefully
- **WHEN** the Google search tool fails or returns no results
- **THEN** the agent SHALL catch the error
- **AND** return a clear message to the caller
- **AND** log the error for debugging
- **AND** NOT crash the calling workflow

### Requirement: Research Agent System Prompt
The system SHALL configure the research agent with specialized instructions optimized for web search and report synthesis.

#### Scenario: System prompt is research-optimized
- **WHEN** the research agent is initialized
- **THEN** the system prompt SHALL include instructions for:
  - Crafting effective search queries from user input
  - Synthesizing multiple search results into coherent reports
  - Acknowledging sources and limitations
  - Avoiding hallucinated information
  - Knowing when to execute additional searches vs. synthesizing current results

#### Scenario: System prompt prevents hallucination
- **WHEN** the agent generates a report
- **THEN** the prompt SHALL explicitly forbid making up search results
- **AND** the prompt SHALL require the agent to only use actual search results
- **AND** the prompt SHALL instruct the agent to explicitly state when information is unavailable

### Requirement: Research Agent in Agent Network
The system SHALL register the research agent in the Mastra instance and export it for use by other agents and workflows.

#### Scenario: Research agent is registered alongside chat agent
- **WHEN** `mastra/agents/index.ts` is loaded
- **THEN** both `chatAgent` and `researchAgent` SHALL be exported
- **AND** both SHALL be registered in `mastraAgents` object
- **AND** both SHALL be referenced in `AGENT_NAMES` enum

#### Scenario: Research agent can be used in agent networks
- **WHEN** building multi-agent workflows or agent networks
- **THEN** the research agent SHALL be available as a callable component
- **AND** other agents SHALL be able to delegate research tasks to it
- **AND** the research agent SHALL return structured research reports for downstream processing
