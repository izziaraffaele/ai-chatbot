# Implementation Tasks - Phase 2: Chat Endpoint Migration

## 1. Endpoint Migration
- [ ] 1.1 Review current `/app/(chat)/api/chat/route.ts` implementation
- [ ] 1.2 Create `createToolContext` call in route handler with session and chat metadata
- [ ] 1.3 Replace AI SDK `streamText()` with Mastra `agent.stream(format: "aisdk")`
- [ ] 1.4 Use `.toUIMessageStreamResponse()` for SSE transformation
- [ ] 1.5 Remove AI SDK imports and dependencies from chat endpoint

## 2. Tool Context Integration
- [ ] 2.1 Import `createToolContext` from `@mastra/utils/runtime-utils.ts`
- [ ] 2.2 Extract session from Next.js `auth()` helper in route handler
- [ ] 2.3 Extract chatId and userId from request body/params
- [ ] 2.4 Create toolContext with session, chatId, userId, geolocation
- [ ] 2.5 Verify Phase 1 tools (getWeather, createDocument, etc.) access context correctly

## 3. tokenlens Integration
- [ ] 3.1 Implement `onFinish` callback in agent.stream() to capture usage
- [ ] 3.2 Call `getTokenlensCatalog()` to retrieve model variant information
- [ ] 3.3 Call `getUsage()` to enrich usage with tokenlens data
- [ ] 3.4 Write enriched usage to stream via tool writer or custom event
- [ ] 3.5 Test usage enrichment with actual model responses

## 4. Error Handling & Logging
- [ ] 4.1 Add try-catch around agent.stream() call
- [ ] 4.2 Implement `onError` callback for agent error handling
- [ ] 4.3 Log errors with chatId, userId, and full error context
- [ ] 4.4 Return client-friendly error messages on stream failure
- [ ] 4.5 Handle partial message saves on stream interruption

## 5. Message Persistence
- [ ] 5.1 Verify message format compatibility (parts-based schema)
- [ ] 5.2 Extract final message text from stream after completion
- [ ] 5.3 Convert to parts format if needed (check Mastra response format)
- [ ] 5.4 Save message to `Message_v2` using existing `lib/db/queries.ts`
- [ ] 5.5 Test message retrieval and conversion with saved messages

## 6. Frontend Integration Testing
- [ ] 6.1 Start dev server with migrated endpoint
- [ ] 6.2 Test chat message creation and streaming with useChat hook
- [ ] 6.3 Verify stream format compatibility (no client-side changes needed)
- [ ] 6.4 Test tool invocations (weather, document creation, suggestions)
- [ ] 6.5 Verify tool events appear in message stream
- [ ] 6.6 Test error scenarios and error message display

## 7. Cleanup & Documentation
- [ ] 7.1 Remove unused AI SDK code from chat endpoint
- [ ] 7.2 Update comments/docs in route handler explaining Mastra integration
- [ ] 7.3 Document tool context injection pattern for reference
- [ ] 7.4 Verify no AI SDK direct imports remain in chat endpoint

## Notes
- **Assumption:** Phase 1 verification confirmed tool context access works (✓)
- **Assumption:** Phase 1 verification confirmed stream format compatibility (✓)
- **Key file:** `/app/(chat)/api/chat/route.ts` - primary implementation location
- **Testing:** Manual frontend testing with dev server; no automated E2E tests required
- **Rollback:** Keep git history; can revert to AI SDK if critical issues found

