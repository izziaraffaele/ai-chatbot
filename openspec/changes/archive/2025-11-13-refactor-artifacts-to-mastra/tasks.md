# Implementation Tasks

## 1. Update Type Definitions

- [x] 1.1 Update `CreateDocumentCallbackProps` to include `agent?: Agent` parameter
- [x] 1.2 Update `UpdateDocumentCallbackProps` to include `agent?: Agent` parameter
- [x] 1.3 Add Agent type imports from `@mastra/core` in `lib/artifacts/server.ts`

## 2. Refactor createDocumentHandler Config and Agent Creation

- [x] 2.1 Import `Agent` class from `@mastra/core`
- [x] 2.2 Import artifact model configuration from `lib/ai/providers.ts`
- [x] 2.3 Extend createDocumentHandler config type to accept optional `model?: string` parameter
- [x] 2.4 Create internal `documentExpert` agent within `createDocumentHandler` using provided model or default .env variable ARTIFACT_MODEL
- [x] 2.5 Pass `documentExpert` agent to `config.onCreateDocument` call
- [x] 2.6 Pass `documentExpert` agent to `config.onUpdateDocument` call

## 3. Refactor Text Document Handler

- [x] 3.1 Update `onCreateDocument` to accept `agent` parameter
- [x] 3.2 Remove `textStream`
- [x] 3.3 Call `agent.stream(title)` for text generation
- [x] 3.4 Loop through `agent.stream().textStream` using `for-await` to receive streaming text chunks
- [x] 3.5 For each chunk, emit to dataStream using `dataStream.write({ type: 'data-textDelta', data: chunk, transient: true })`
- [x] 3.6 Accumulate chunks into `draftContent` and return final result
- [x] 3.7 Update `onUpdateDocument` with same `agent.stream()` + textStream approach
- [ ] 3.8 Test streaming output format matches expected data stream events

## 4. Refactor Code Document Handler

- [x] 4.1 Update `onCreateDocument` to accept `agent` parameter
- [x] 4.2 Remove `streamObject` and Zod schema imports
- [x] 4.3 Call `agent.stream(title)` for code generation
- [x] 4.4 Loop through `agent.stream().textStream` using `for-await` to receive streaming code text
- [x] 4.5 For each chunk, emit to dataStream using `dataStream.write({ type: 'data-codeDelta', data: chunk, transient: true })`
- [x] 4.6 Accumulate chunks into `draftContent` and return final result
- [x] 4.7 Update `onUpdateDocument` with same streaming approach
- [ ] 4.8 Validate code formatting and syntax highlighting compatibility

## 5. Refactor Sheet Document Handler

- [x] 5.1 Update `onCreateDocument` to accept `agent` parameter
- [x] 5.2 Remove `streamObject` and Zod schema imports
- [x] 5.3 Call `agent.stream(title)` for sheet/CSV generation
- [x] 5.4 Loop through `agent.stream().textStream` using `for-await` to receive streaming CSV text
- [x] 5.5 For each chunk, emit to dataStream using `dataStream.write({ type: 'data-sheetDelta', data: chunk, transient: true })`
- [x] 5.6 Accumulate chunks into `draftContent` and return final result
- [x] 5.7 Update `onUpdateDocument` with same streaming approach
- [ ] 5.8 Test grid data structure integrity and CSV parsing

## 6. Testing & Validation

- [ ] 6.1 Run E2E tests for document creation with `pnpm test`
- [ ] 6.2 Verify text artifact creation produces valid streaming output
- [ ] 6.3 Verify code artifact creation streams syntax-valid code
- [ ] 6.4 Verify sheet artifact creation produces valid table data
- [ ] 6.5 Test document update functionality for all artifact types
- [ ] 6.6 Verify dataStream event format matches client expectations
- [ ] 6.7 Check token usage tracking integrates with artifact agents

## 7. Code Quality & Documentation

- [ ] 7.1 Run `pnpm lint` and `pnpm format` to ensure code style compliance
- [ ] 7.2 Verify TypeScript strict mode passes on all modified files
- [x] 7.3 Update JSDoc comments in artifact handlers explaining Mastra integration
- [x] 7.4 Add code comments explaining stream consumption approach
