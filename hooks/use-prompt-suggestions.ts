import { useTranslations } from "@/lib/i18n/use-translations";
import { useDemoConfig } from "./use-demo-config";

export function usePromptSuggestions() {
  const { value } = useDemoConfig();
  const t = useTranslations();

  const defaultValue = [
    t("chat.suggestions.prompt1", "What are the advantages of using Next.js?"),
    t(
      "chat.suggestions.prompt2",
      "Write code to demonstrate Dijkstra's algorithm"
    ),
    t(
      "chat.suggestions.prompt3",
      "Help me write an essay about Silicon Valley"
    ),
    t("chat.suggestions.prompt4", "What is the weather in San Francisco?"),
  ];

  return {
    suggestions: value.chat.suggestions.length
      ? value.chat.suggestions
      : defaultValue,
  };
}
