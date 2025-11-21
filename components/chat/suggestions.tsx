"use client";

import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Suggestion, Suggestions } from "@/components/elements/suggestion";
import { cn } from "@/lib/utils";
import { useChatContext } from "./context";

/**
 * Auto-apply behavior modes for suggestions
 */
export type ChatSuggestionAutoApply = "input" | "message" | "none";

/**
 * Chat suggestion context type
 */
export type ChatSuggestionContext = {
  /** Current suggestions from provider */
  suggestions: string[];
  /** Function to handle suggestion application */
  onApply: (suggestion: string) => void;
  /** Whether provider context is available */
  hasProvider: boolean;
  /** Auto-apply behavior mode */
  autoApply: ChatSuggestionAutoApply;
};

/**
 * Chat suggestion provider props
 */
export type ChatSuggestionProviderProps = {
  /** Initial suggestions to set the context value */
  initialSuggestions?: string[];
  /** Current suggestions (overrides initial) */
  suggestions?: string[];
  /** Auto-apply behavior mode */
  autoApply?: ChatSuggestionAutoApply;
  /** Custom handler for suggestion application */
  onApply?: (suggestion: string) => void;
  /** Child components */
  children: ReactNode;
};

/**
 * Chat suggestions component props
 */
export type ChatSuggestionsProps = {
  /** Suggestion array (overrides provider context) */
  suggestions?: string[];
  /** Custom click handler (overrides provider context) */
  onApply?: (suggestion: string) => void;
  /** Layout mode */
  mode?: "default" | "minimal";
  /** Additional className */
  className?: string;
  animate?: boolean;
};

/**
 * Chat suggestion context
 */
const ChatSuggestionContext = createContext<ChatSuggestionContext | null>(null);

/**
 * ChatSuggestionProvider Component
 *
 * Provides suggestion state and auto-apply behavior within the ChatProvider context.
 * Must be nested within ChatProvider for runtime access.
 *
 * @example
 * ```tsx
 * <ChatProvider>
 *   <ChatSuggestionProvider
 *     initialSuggestions={["What is Next.js?"]}
 *     suggestions={["Dynamic suggestion"]}
 *     autoApply="input"
 *   >
 *     <ChatSuggestions />
 *   </ChatSuggestionProvider>
 * </ChatProvider>
 * ```
 */
function PureChatSuggestionProvider({
  initialSuggestions = [],
  suggestions,
  autoApply = "input",
  onApply,
  children,
}: ChatSuggestionProviderProps) {
  // Get runtime access for auto-apply functionality
  const { setInput, sendMessage } = useChatContext();

  // Use suggestions prop if provided, otherwise use initialSuggestions
  const [currentSuggestions, setCurrentSuggestions] = useState(() =>
    suggestions !== undefined ? suggestions : initialSuggestions
  );

  // Update current suggestions when suggestions prop changes
  if (suggestions !== undefined && suggestions !== currentSuggestions) {
    setCurrentSuggestions(suggestions);
  }

  // Default suggestion application handler
  const defaultOnApply = useCallback(
    (suggestion: string) => {
      try {
        switch (autoApply) {
          case "input": {
            // Populate prompt input and focus
            setInput(suggestion);
            // Focus the textarea
            const textareaElement = document.querySelector(
              "textarea"
            ) as HTMLTextAreaElement;
            textareaElement?.focus();
            break;
          }

          case "message": {
            // Send as new message immediately
            sendMessage({ text: suggestion, files: [] });
            break;
          }

          default: {
            // No auto-apply behavior
            break;
          }
        }
      } catch (error) {
        console.error("Failed to apply suggestion:", error);
      }
    },
    [autoApply, sendMessage, setInput]
  );

  // Use custom handler if provided, otherwise use default
  const handleApply = onApply || defaultOnApply;

  // Context value
  const contextValue = useMemo<ChatSuggestionContext>(
    () => ({
      suggestions: currentSuggestions,
      onApply: handleApply,
      hasProvider: true,
      autoApply,
    }),
    [currentSuggestions, handleApply, autoApply]
  );

  useEffect(() => {
    // Update current suggestions when suggestions prop changes
    if (suggestions !== undefined && suggestions !== currentSuggestions) {
      setCurrentSuggestions(suggestions);
    }
  }, [suggestions, currentSuggestions]);

  return (
    <ChatSuggestionContext.Provider value={contextValue}>
      {children}
    </ChatSuggestionContext.Provider>
  );
}

export const ChatSuggestionProvider = memo(
  PureChatSuggestionProvider,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.suggestions, nextProps.suggestions) &&
      prevProps.autoApply === nextProps.autoApply &&
      prevProps.onApply === nextProps.onApply &&
      prevProps.children === nextProps.children
    );
  }
);

/**
 * useChatSuggestions Hook
 *
 * Access suggestion context from ChatSuggestionProvider.
 * Returns minimal state when no provider is available.
 *
 * @returns Suggestion context or minimal state
 *
 * @example
 * ```tsx
 * const suggestions = useChatSuggestions();
 * if (suggestions.hasProvider) {
 *   console.log("Available suggestions:", suggestions.suggestions);
 * }
 * ```
 */
export function useChatSuggestions(): ChatSuggestionContext {
  const context = useContext(ChatSuggestionContext);

  if (!context) {
    return {
      suggestions: [],
      onApply: () => {
        // No-op when no provider
      },
      hasProvider: false,
      autoApply: "none",
    };
  }

  return context;
}

/**
 * ChatSuggestions Component
 *
 * Renders suggestions using different layout modes and works with or without provider context.
 * Uses existing Suggestions and Suggestion elements from @/components/elements/suggestion.tsx.
 *
 * @param suggestions - Suggestion array (overrides provider context)
 * @param onApply - Custom click handler (overrides provider context)
 * @param mode - Layout mode: "default" (grid) or "minimal" (slider)
 * @param className - Additional className for styling
 *
 * @example
 * ```tsx
 * // With provider context
 * <ChatSuggestions mode="default" />
 *
 * // With props override
 * <ChatSuggestions
 *   suggestions={["Custom suggestions"]}
 *   onApply={(suggestion) => console.log("Custom:", suggestion)}
 *   mode="minimal"
 * />
 * ```
 */
export function ChatSuggestions({
  suggestions: propsSuggestions,
  onApply: propsOnApply,
  mode = "default",
  className,
  animate,
}: ChatSuggestionsProps) {
  // Get provider context
  const context = useChatSuggestions();
  const [isMounted, setIsMounted] = useState(false);

  // Props always override context
  const suggestions = propsSuggestions || context.suggestions;
  const onApply = propsOnApply || context.onApply;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  // Don't render if no suggestions
  if (suggestions.length === 0) {
    return null;
  }

  // Default mode: responsive grid
  if (mode === "default") {
    return (
      <div
        className={cn(
          "grid w-full grid-cols-1 gap-2 sm:grid-cols-2",
          className
        )}
        data-slot="chat-suggestions-grid"
      >
        {suggestions.map((suggestion, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            initial={animate === false ? false : { opacity: 0, y: 20 }}
            key={suggestion}
            transition={{ delay: 0.05 * index }}
          >
            <Suggestion
              className="h-auto w-full whitespace-normal p-3 text-left"
              onClick={onApply}
              size="sm"
              suggestion={suggestion}
              variant="outline"
            >
              <span className="truncate">{suggestion}</span>
            </Suggestion>
          </motion.div>
        ))}
      </div>
    );
  }

  // Minimal mode: horizontal slider using existing Suggestions element
  return (
    <Suggestions
      className={cn("w-full", className)}
      data-slot="chat-suggestions-slider"
    >
      {suggestions.map((suggestion, index) => (
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          initial={{ opacity: 0, x: 20 }}
          key={suggestion}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            onClick={onApply}
            size="sm"
            suggestion={suggestion}
            variant="outline"
          />
        </motion.div>
      ))}
    </Suggestions>
  );
}
