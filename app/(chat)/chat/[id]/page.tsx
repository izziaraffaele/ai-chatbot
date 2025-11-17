import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { AssistantChat } from "@/components/assistant-chat";
import { ChatProvider } from "@/components/chat/context";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  return (
    <ChatProvider
      id={chat.id}
      initialMessages={uiMessages}
      initialUsage={chat.lastContext ?? undefined}
      initialVisibilityType={chat.visibility}
    >
      <AssistantChat
        autoResume={true}
        isReadonly={session?.user?.id !== chat.userId}
      />
    </ChatProvider>
  );
}
