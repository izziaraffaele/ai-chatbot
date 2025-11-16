import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/assistant-chat";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  return (
    <AssistantChat
      autoResume={false}
      chatId={id}
      initialMessages={[]}
      initialVisibilityType="private"
      isReadonly={false}
      key={id}
    />
  );
}
