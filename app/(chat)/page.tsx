import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/assistant-chat-new";
import { ChatProvider } from "@/components/chat";
import { DataStreamProvider } from "@/components/chat/streaming";
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
      <DataStreamProvider>
        <AssistantChat autoResume={false} isReadonly={false} key={id} />
      </DataStreamProvider>
    </ChatProvider>
  );
}
