import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { ChatProvider } from "@/components/chat/context";
import { PFBuilderTestChat } from "@/components/pf-builder/pf-builder-test-chat";
import { generateUUID } from "@/lib/utils";

/**
 * /chat/builder - Direct route to PF Builder for E2E testing
 *
 * This page opens a chat with the PF Builder canvas already visible,
 * allowing tests to interact with the builder without needing to trigger
 * a tool call from the chat agent.
 */
export default async function PFBuilderTestPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const chatId = generateUUID();
  const builderId = generateUUID();

  return (
    <ChatProvider
      id={chatId}
      initialMessages={[]}
      initialVisibilityType="private"
      key={chatId}
    >
      <PFBuilderTestChat builderId={builderId} />
    </ChatProvider>
  );
}
