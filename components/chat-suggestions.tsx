import { motion } from "framer-motion";
import { usePromptSuggestions } from "@/hooks/use-prompt-suggestions";
import { cn } from "@/lib/utils";
import { Suggestion, Suggestions } from "./elements/suggestion";

export function ChatSuggestions({
  variant,
  ...others
}: React.ComponentProps<"div"> & {
  variant?: "default" | "compact";
  onSuggestionSelect?: (value: string) => void;
}) {
  return variant === "default" ? (
    <ChatSuggestionGrid {...others} />
  ) : (
    <ChatSuggestionSlider {...others} />
  );
}

export function ChatSuggestionGrid({
  className,
  onSuggestionSelect,
  ...others
}: React.ComponentProps<"div"> & {
  onSuggestionSelect?: (value: string) => void;
}) {
  const { suggestions } = usePromptSuggestions();

  return (
    <div
      className={cn("grid w-full gap-2 sm:grid-cols-2", className)}
      data-testid="suggested-actions"
      {...others}
    >
      {suggestions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={onSuggestionSelect}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export function ChatSuggestionSlider({
  onSuggestionSelect,
  className,
}: {
  className?: string;
  onSuggestionSelect?: (value: string) => void;
}) {
  const { suggestions } = usePromptSuggestions();

  return (
    <Suggestions className={className}>
      {suggestions.map((suggestedAction) => (
        <Suggestion
          key={suggestedAction}
          onClick={onSuggestionSelect}
          suggestion={suggestedAction}
        >
          {suggestedAction}
        </Suggestion>
      ))}
    </Suggestions>
  );
}
