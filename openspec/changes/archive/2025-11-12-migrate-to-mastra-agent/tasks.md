# Implementation Tasks

## 1. Tool Migration
- [x] 1.1 Create Mastra-compatible getWeather tool with session context
- [x] 1.2 Create Mastra-compatible createDocument tool with dataStream support
- [x] 1.3 Create Mastra-compatible updateDocument tool with dataStream support
- [x] 1.4 Create Mastra-compatible requestSuggestions tool with dataStream support
- [x] 1.5 Add tool type definitions and exports in mastra/tools/index.ts

## 2. Chat Agent Configuration
- [x] 2.1 Create chat agent with system prompt configuration
- [x] 2.2 Enhance system prompt with dynamic geolocation hints and model-aware instructions
- [x] 2.3 Register all 4 tools with the agent
- [x] 2.4 Add memory configuration for conversation history
- [x] 2.5 Create factory function for runtime context injection (session, geolocation)

## 3. Integration Features
- [x] 3.1 Implement tokenlens integration for usage tracking in agent responses
- [ ] 3.2 Test session context propagation to agent and tools
- [ ] 3.3 Test dataStream context for real-time tool updates
- [ ] 3.4 Verify smooth streaming support with Mastra agent

## 4. Agent Registration & Type Safety
- [x] 4.1 Register chat agent in mastra/index.ts
- [x] 4.2 Export chat agent from mastra module
- [x] 4.3 Add comprehensive type definitions for agent responses and tool contexts

## 5. Agent Capability Verification
- [ ] 5.1 Verify agent responds to basic chat messages without tools
- [ ] 5.2 Verify all 4 tools are available and callable by agent
- [ ] 5.3 Verify tool context injection (session and dataStream) works in practice
- [ ] 5.4 Verify tokenlens usage tracking integrates correctly
- [ ] 5.5 Verify memory configuration preserves conversation context
- [ ] 5.6 Verify stream compatibility with existing data format

## Notes
- **Out of scope (Phase 2):** API endpoint integration, reasoning model support (disabled tools), endpoint feature flagging
- **Phase 1 focus:** Create standalone agent with all tools and proper context handling for future integration
