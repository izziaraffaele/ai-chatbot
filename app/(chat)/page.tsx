import { redirect } from "next/navigation";
import { ChatProvider } from "@/components/chat/context";
import { DemoChat } from "@/components/demo-chat";
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
      <DemoChat autoResume={false} isReadonly={false} key={id} />
    </ChatProvider>
  );
}
