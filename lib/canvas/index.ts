// Canvas module - Widget registry and context providers

export {
  useWidgetActions,
  useWidgetContent,
  // Hooks
  useWidgetContext,
  useWidgetIdentity,
  useWidgetMeta,
  useWidgetStatus,
  // Context providers
  WidgetContextProvider,
  type WidgetContextProviderProps,
  // Types
  type WidgetContextValue,
} from "./widget-context";
export {
  builtInWidgetDefinitions,
  codeWidgetDefinition,
  documentSelectorWidgetDefinition,
  imageWidgetDefinition,
  // Registration function
  registerBuiltInWidgets,
  sheetWidgetDefinition,
  // Widget definitions
  textWidgetDefinition,
} from "./widget-definitions";
export {
  type CanvasTabData,
  generatePendingDocumentId,
  generateTabId,
  getWidgetCategory,
  // Helper functions
  isDocumentKind,
  isMediaKind,
  isPendingDocumentId,
  isSelectorKind,
  PENDING_DOC_PREFIX,
  // Constants
  WIDGET_KINDS,
  type WidgetDefinition,
  // Types
  type WidgetKind,
  type WidgetRendererProps,
  type WidgetStatus,
  // Registry
  widgetRegistry,
} from "./widget-registry";
export {
  clearAllVisibleContent,
  clearVisibleContent,
  getVisibleContent,
  hasVisibleContent,
  setVisibleContent,
  subscribeToVisibleContent,
  // Visible content store
  type VisibleContent,
} from "./visible-content-store";
