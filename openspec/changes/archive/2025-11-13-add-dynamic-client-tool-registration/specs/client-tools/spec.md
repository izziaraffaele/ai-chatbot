## MODIFIED Requirements

### Requirement: useClientTools Hook
The system SHALL provide a React hook that returns a registry object for managing assistant actions in components.

#### Scenario: Hook returns registry object
- **WHEN** a component calls `useClientTools()`
- **THEN** the hook SHALL return a registry object with methods: `register(action)`, `deregister(id)`, and `getTools()`
- **AND** the registry SHALL be stable across component renders

#### Scenario: Registry provides all registered actions
- **WHEN** the chat component calls `registry.getTools()`
- **THEN** the registry SHALL return an object containing all currently registered actions
- **AND** the actions SHALL be available to the Mastra agent for execution

### Requirement: Client Tool Execution
The system SHALL execute client actions when the Mastra agent calls them during conversation.

#### Scenario: Agent invokes a registered client action
- **WHEN** an agent requests execution of a registered client action
- **THEN** the action's execute handler SHALL run in the browser
- **AND** the action's result SHALL be returned to the agent
- **AND** the agent SHALL continue processing based on the result

#### Scenario: Client action can access browser APIs
- **WHEN** a client action executes
- **THEN** it SHALL have access to browser APIs (DOM, localStorage, clipboard, etc.)
- **AND** it SHALL be able to modify page state if needed

## ADDED Requirements

### Requirement: Dynamic Assistant Action Registration
The system SHALL support registering assistant actions from React components at runtime via the `useAssistantAction()` hook.

#### Scenario: Register action on component mount
- **WHEN** a component calls `useAssistantAction(action)` during render
- **THEN** the action SHALL be registered in the registry on component mount
- **AND** the action SHALL be available to the agent in subsequent chat messages

#### Scenario: Deregister action on component unmount
- **WHEN** a component using `useAssistantAction(action)` unmounts
- **THEN** the action SHALL be automatically deregistered from the registry
- **AND** the action SHALL no longer be available to the agent

#### Scenario: Lifecycle works with strict mode
- **WHEN** React strict mode double-mounts a component
- **THEN** the component's action SHALL still be correctly registered and deregistered
- **AND** deregistration SHALL be idempotent (safe to call multiple times)

### Requirement: Registry API
The system SHALL provide a registry object with methods for managing assistant actions.

#### Scenario: Register action via registry
- **WHEN** code calls `registry.register(action)` where action has a unique ID
- **THEN** the action SHALL be added to the registry
- **AND** if an action with the same ID exists, it SHALL be replaced

#### Scenario: Deregister action via registry
- **WHEN** code calls `registry.deregister(actionId)`
- **THEN** the action SHALL be removed from the registry
- **AND** subsequent calls to deregister the same ID SHALL not raise errors (idempotent)

#### Scenario: Registry starts empty
- **WHEN** the application initializes
- **THEN** the registry SHALL contain no actions initially
- **AND** actions SHALL only be added when explicitly registered

#### Scenario: Get all registered actions
- **WHEN** code calls `registry.getTools()`
- **THEN** the registry SHALL return an object containing all currently registered actions
- **AND** if no actions are registered, an empty object SHALL be returned
- **AND** the returned object SHALL be compatible with Mastra agent serialization

### Requirement: useAssistantAction Hook
The system SHALL provide a React hook for simplified action registration in components.

#### Scenario: Hook simplifies action registration
- **WHEN** a component calls `useAssistantAction(action)`
- **THEN** the hook SHALL handle registration on mount and deregistration on unmount automatically
- **AND** the developer SHALL not need to write manual useEffect cleanup code

#### Scenario: Multiple components can register actions
- **WHEN** multiple components each call `useAssistantAction()` with their respective actions
- **THEN** all actions SHALL be registered and available to the agent
- **AND** each action SHALL be deregistered only when its component unmounts

### Requirement: Type Safety for Dynamic Actions
The system SHALL maintain type safety for dynamically registered actions.

#### Scenario: Registered actions have correct types
- **WHEN** an action is registered via `useAssistantAction(action)` or `registry.register(action)`
- **THEN** the action's inputSchema (Zod schema) and execute handler SHALL be validated at registration
- **AND** TypeScript SHALL enforce correct types for the action parameter

#### Scenario: getTools returns typed actions
- **WHEN** code receives the result of `registry.getTools()`
- **THEN** TypeScript SHALL provide autocomplete for registered action IDs
- **AND** the types SHALL match the action definitions
