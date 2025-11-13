# Change: Dynamic Assistant Actions Registration

## Why

Currently, client tools must be statically defined in `lib/ai/client-tools.ts` and cannot be registered from React components at runtime. From a developer perspective, these are "assistant actions"—capabilities the AI assistant can invoke. Supporting dynamic registration enables:

- Registering actions from within custom hooks and component libraries
- Loading actions conditionally based on features or permissions
- Building extensible plugin architectures
- Supporting third-party action libraries
- Clearer developer experience with a dedicated registration hook

## What Changes

- Enhance `useClientTools()` to return a registry object with `register(action)`, `deregister(id)`, and `getTools()` methods
- Create `useAssistantAction(action)` hook for simplified action registration and lifecycle management in components
- Implement dynamic registry in `lib/ai/client-tools.ts` that starts empty (no default actions)
- Update chat component to use registry API and call `registry.getTools()` to get current actions
- Actions are automatically deregistered when components unmount via `useEffect` cleanup

## Impact

- **Affected specs:** `client-tools`
- **Affected code:**
  - `lib/ai/client-tools.ts` - Implement dynamic registry
  - `hooks/use-client-tools.ts` - Return registry object instead of static tools
  - `hooks/use-assistant-action.ts` - New hook for registration in components
  - `components/chat.tsx` - Update to use registry API
  - Any other files using `useClientTools()`
- **Breaking changes:** Yes—`useClientTools()` now returns a registry object, not the tools directly
