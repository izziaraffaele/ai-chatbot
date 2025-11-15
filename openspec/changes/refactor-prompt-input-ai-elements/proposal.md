# Change: Refactor MultimodalInput to Leverage AI Elements Components

## Why

**Important:** The codebase already uses Vercel's AI Elements library (`<PromptInput />`, `<PromptInputTextarea />`, etc.). This is **NOT** a migration to AI Elements—it's a consolidation and refactoring of existing AI Elements usage.

Currently, `MultimodalInput` (458 lines) wraps AI Elements components alongside custom logic for:
- File upload handling
- Paste event management
- Textarea height adjustment
- Input persistence
- Form submission

This refactoring consolidates these concerns into a cleaner `MessageInput` wrapper component, reducing custom code maintenance burden while improving composability and internal organization.

## What Changes

- **Create `components/message-input.tsx`** - New composable wrapper combining MultimodalInput + AgentSelector
  - Composes AI Elements `<PromptInput />` with agent selection
  - Handles attachment management, paste events, file uploads
  - Manages suggested actions and input state persistence
  - Provides cleaner API for chat interface consumers

- **Refactor `AgentSelector`** to support composable integration
  - Support both standalone dropdown and toolbar-integrated modes
  - Accept optional className for custom positioning/styling
  - Maintain existing dropdown UI but optimize for composition

- **Deprecate `MultimodalInput` component**
  - Migrate all usage to new `MessageInput` component
  - Preserve API compatibility during transition period
  - Remove after all call sites migrated

## Impact

- **Affected specs**: `prompt-input` (new)
- **Affected code**:
  - `components/message-input.tsx` - New component (consolidation)
  - `components/multimodal-input.tsx` - Refactored/deprecated
  - `components/agent-selector.tsx` - Enhanced composability
  - All chat interface call sites - Updated imports
