# tool-ui Specification

## ADDED Requirements

### Requirement: Component-Based Tool UI Architecture
The system SHALL render tool call UI using dedicated, memoized React components organized in a modular structure.

#### Scenario: Each tool type has a dedicated component
- **WHEN** the message rendering system processes a tool call part
- **THEN** the system SHALL route to a dedicated tool UI component (e.g., WeatherToolUI, CreateDocumentToolUI)
- **AND** the tool UI component SHALL be responsible for rendering its own input/output UI

#### Scenario: Tool components are memoized to prevent unnecessary re-renders
- **WHEN** a tool component receives unchanged `part` props
- **THEN** React.memo() SHALL prevent re-rendering the component
- **AND** deep equality comparison SHALL be used to detect `part` changes

#### Scenario: Tool components have type-safe props
- **WHEN** a tool UI component is implemented
- **THEN** the `part` prop SHALL be typed as `ToolUIPart<ToolType>` from the AI SDK
- **AND** TypeScript SHALL enforce type safety for part.input, part.output, and part.state access

#### Scenario: Tool UI components are discoverable and organized
- **WHEN** a developer needs to modify tool UI or add a new tool
- **THEN** all tool UI components SHALL be located in `components/tools/` directory
- **AND** each tool component SHALL follow a consistent naming pattern (e.g., `weather-tool.tsx`, `create-document-tool.tsx`)
- **AND** the `ToolUIRouter` SHALL be located in `components/tool-ui-router.tsx` for centralized routing

### Requirement: Tool Component Lifecycle
The system SHALL manage tool call state transitions and lifecycle within individual tool components.

#### Scenario: Tool component shows input parameters
- **WHEN** a tool component renders with `part.state === 'input-available'`
- **THEN** the component SHALL display the tool's input parameters
- **AND** the parameters SHALL be formatted as JSON or in a human-readable format

#### Scenario: Tool component shows output results
- **WHEN** a tool component renders with `part.state === 'output-available'`
- **THEN** the component SHALL display the tool's output
- **AND** the component SHALL use custom rendering (e.g., Weather component for getWeather tool)

#### Scenario: Tool component shows loading state
- **WHEN** a tool component renders with `part.state === 'input-streaming'`
- **THEN** the component SHALL display a pending/loading status
- **AND** the component MAY collapse input/output sections until state changes

#### Scenario: Tool component shows error state
- **WHEN** a tool component renders with `part.state === 'output-error'` or output contains error
- **THEN** the component SHALL display an error message
- **AND** the error message SHALL be visually distinct (e.g., red styling)

#### Scenario: Tool component manages collapsible UI
- **WHEN** a tool component is rendered
- **THEN** the component SHALL use the Collapsible (Tool/ToolHeader/ToolContent) structure
- **AND** the collapsible MAY default to open based on state or implementation choice
- **AND** users SHALL be able to collapse/expand tool sections to manage screen space

### Requirement: Routing Tool Parts to Components
The system SHALL route tool call parts to the correct UI component based on part type.

#### Scenario: PreviewMessage routes tool parts to components
- **WHEN** PreviewMessage renders a message with tool parts
- **THEN** for each tool part, PreviewMessage SHALL determine the part type (e.g., 'tool-getWeather')
- **AND** route the part to the corresponding tool UI component
- **AND** pass the full part object as a prop

#### Scenario: All tool types are routed
- **WHEN** PreviewMessage encounters any of the 4 standard tool types (getWeather, createDocument, updateDocument, requestSuggestions)
- **THEN** each SHALL be routed to its dedicated component
- **AND** routing SHALL be exhaustive (TypeScript SHALL enforce no unhandled tool types)

#### Scenario: Unknown tool types fail safely
- **WHEN** a tool part with an unrecognized type is encountered
- **THEN** PreviewMessage SHALL return null or a generic error component
- **AND** the error SHALL NOT break message rendering

### Requirement: Tool UI Component Interface
The system SHALL define a consistent interface for tool UI components.

#### Scenario: Tool component accepts part prop
- **WHEN** a tool UI component is invoked
- **THEN** it SHALL accept a `part` prop of type `ToolUIPart<ToolType>`
- **AND** no other props SHALL be required for basic rendering

#### Scenario: Tool component respects isReadonly state
- **WHEN** a tool UI component is rendered with `isReadonly === true`
- **THEN** the component SHALL disable any interactive elements (buttons, collapsible sections, etc.)
- **AND** the component SHALL still render read-only display of tool input and output
- **AND** the component SHALL include isReadonly in its memoization equality check
- **WHEN** isReadonly changes from true to false or vice versa
- **THEN** the component SHALL re-render to update interactivity

#### Scenario: Tool components can accept custom styling
- **WHEN** styling customization is needed
- **THEN** tool components MAY accept an optional `className` prop for custom CSS classes
- **AND** internal structure SHALL still use base classes for consistent layout

### Requirement: Existing Tool Implementations
The system SHALL provide UI components for all 4 existing server-side tools.

#### Scenario: Weather tool component displays location and conditions
- **WHEN** WeatherToolUI component renders weather tool output
- **THEN** it SHALL use the existing `<Weather />` component
- **AND** display temperature, conditions, and location information
- **AND** format output for human readability

#### Scenario: Create document tool component displays document preview
- **WHEN** CreateDocumentToolUI component renders
- **THEN** it SHALL use the existing `<DocumentPreview />` component
- **AND** display document metadata (title, kind, ID)
- **AND** show document creation status and any errors

#### Scenario: Update document tool component displays update preview
- **WHEN** UpdateDocumentToolUI component renders
- **THEN** it SHALL use the existing `<DocumentPreview />` component with `isUpdate: true` flag
- **AND** display the document being updated and changes made
- **AND** preserve error handling for failed updates

#### Scenario: Request suggestions tool component displays suggestions
- **WHEN** RequestSuggestionsToolUI component renders
- **THEN** it SHALL use the existing `<DocumentToolResult type="request-suggestions" />` component
- **AND** display generated suggestions in an editable format
- **AND** allow user interaction with suggestions if not read-only

### Requirement: Backwards Compatibility
The system SHALL maintain backwards compatibility with existing message rendering behavior.

#### Scenario: Message structure remains unchanged
- **WHEN** tool parts are processed
- **THEN** the data structure (from `part.input`, `part.output`, `part.state`) SHALL remain identical
- **AND** no changes to database schema or message serialization formats

#### Scenario: Tool execution behavior unchanged
- **WHEN** tools are executed on the server
- **THEN** tool calling, parameter validation, and output generation SHALL work identically
- **AND** this change is UI-only and SHALL NOT affect server-side tool behavior

#### Scenario: E2E test compatibility
- **WHEN** existing end-to-end tests are run
- **THEN** all tests SHALL pass without modification
- **AND** tool call rendering assertions SHALL still pass
