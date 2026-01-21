import { redirect } from "next/navigation";
import { ChatProvider } from "@/components/chat/context";
import { DemoChat } from "@/components/demo-chat";
import { loadTranslations } from "@/lib/i18n/utils";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  // Load Italian translations for welcome message
  const translations = await loadTranslations();

  // Create initial welcome message from the assistant
  const welcomeMessage: ChatMessage = {
    id: generateUUID(),
    role: "assistant",
    parts: [{ type: "text", text: translations["chat.welcome.message"] }],
    createdAt: new Date(),
  };

  return (
    <ChatProvider
      id={id}
      initialMessages={[welcomeMessage]}
      initialVisibilityType="private"
      key={id}
    >
      <DemoChat autoResume={false} isReadonly={false} key={id} />
    </ChatProvider>
  );
}
