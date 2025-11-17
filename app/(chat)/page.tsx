import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/assistant-chat";
import { ChatProvider } from "@/components/chat/context";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  return (
    <ChatProvider id={id} initialMessages={[]} initialVisibilityType="private">
      <AssistantChat autoResume={false} isReadonly={false} key={id} />
    </ChatProvider>
  );
}
