import { DefaultChatTransport, type HttpChatTransportInitOptions } from "ai";
import type { ChatMessage } from "./types";
import { fetchWithErrorHandlers } from "./utils";

const CHAT_API =
  process.env.CHAT_API || process.env.NEXT_PUBLIC_CHAT_API || "/api/chat";

export function createChatTransport(
  props: Partial<HttpChatTransportInitOptions<ChatMessage>>
) {
  return new DefaultChatTransport({
    api: CHAT_API,
    fetch: fetchWithErrorHandlers,
    ...props,
  });
}
