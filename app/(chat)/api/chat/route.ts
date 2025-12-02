import { toAISdkFormat } from "@mastra/ai-sdk";
import type { Agent } from "@mastra/core/agent";
import { geolocation } from "@vercel/functions";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { titlePrompt } from "@/lib/ai/prompts";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
  updateMessageParts,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { enrichUsageWithTokenlens } from "@/lib/tokenlens";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { mastra } from "@/mastra";
import { createToolContext } from "@/mastra/utils/runtime-utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

/** Validates and parses the incoming chat request */
async function validateRequest(
  request: Request
): Promise<PostRequestBody | Response> {
  try {
    const json = await request.json();
    const parsed = postRequestBodySchema.parse(json);
    return parsed;
  } catch (_) {
    console.error(_);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

/** Checks if user has exceeded their daily message limit */
async function checkRateLimits(
  userId: string,
  userType: UserType
): Promise<Response | null> {
  const messageCount = await getMessageCountByUserId({
    id: userId,
    differenceInHours: 24,
  });

  const { maxMessagesPerDay } = entitlementsByUserType[userType];
  if (messageCount > maxMessagesPerDay) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }

  return null;
}

/** Processes user messages: creates chat if needed, saves message */
async function handleUserMessage(params: {
  id: string;
  message: ChatMessage;
  session: any;
  selectedVisibilityType: VisibilityType;
  chatAgent: any;
}): Promise<{ messagesFromDb: DBMessage[]; chat: any }> {
  const { id, message, session, selectedVisibilityType, chatAgent } = params;
  const chat = await getChatById({ id });
  let messagesFromDb: DBMessage[] = [];

  if (chat) {
    if (chat.userId !== session.user.id) {
      throw new ChatSDKError("forbidden:chat");
    }
    messagesFromDb = await getMessagesByChatId({ id });
  } else {
    const title = await chatAgent.generateTitleFromUserMessage({
      message,
      tracingContext: {},
      instructions: `Given a chat message, generate a short title.${titlePrompt}`,
    });

    await saveChat({
      id,
      userId: session.user.id,
      title,
      visibility: selectedVisibilityType,
    });
  }

  await saveMessages({
    messages: [
      {
        chatId: id,
        id: message.id,
        role: message.role,
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
      },
    ],
  });

  return { messagesFromDb, chat };
}

/** Processes assistant tool results: updates existing messages */
async function handleAssistantMessage(params: {
  message: ChatMessage;
  messagesFromDb: DBMessage[];
}): Promise<{ uiMessages: ChatMessage[]; lastDbMessage: DBMessage }> {
  const { message, messagesFromDb } = params;
  const lastDbMessageIdx = messagesFromDb.length - 1;
  const lastDbMessage = messagesFromDb[lastDbMessageIdx];

  const isAssistantToolResult =
    lastDbMessage?.role === "assistant" && lastDbMessage?.id === message.id;

  if (!isAssistantToolResult) {
    throw new ChatSDKError("bad_request:api");
  }

  const uiMessages = convertToUIMessages(messagesFromDb);
  uiMessages[lastDbMessageIdx] = {
    ...uiMessages[lastDbMessageIdx],
    parts: uiMessages[lastDbMessageIdx].parts.concat(message.parts),
  };

  await updateMessageParts({
    messageId: lastDbMessage.id,
    parts: uiMessages[lastDbMessageIdx].parts,
  });

  return { uiMessages, lastDbMessage };
}

/** Creates and configures the AI chat stream with all required callbacks */
async function createChatStream(params: {
  uiMessages: ChatMessage[];
  isAssistantToolResult: boolean;
  lastDbMessage: DBMessage | undefined;
  streamId: string;
  chatId: string;
  runtimeContext: any;
  tools: Record<string, unknown> | undefined;
  chatAgent: Agent;
  message: ChatMessage;
}) {
  const {
    uiMessages,
    isAssistantToolResult,
    lastDbMessage,
    streamId,
    chatId,
    runtimeContext,
    tools,
    chatAgent,
    message,
  } = params;

  await createStreamId({ streamId, chatId });

  const stream = await chatAgent.stream(uiMessages, {
    runtimeContext,
    clientTools: tools,
    telemetry: {
      functionId: "chatAgent-stream",
      isEnabled: isProductionEnvironment,
    },
  });

  return createUIMessageStream({
    generateId: () => (isAssistantToolResult ? message.id : generateUUID()),
    originalMessages: isAssistantToolResult
      ? uiMessages.map((msg, idx) =>
          idx === uiMessages.length - 1 ? { ...msg, parts: [] } : msg
        )
      : uiMessages,
    execute: async ({ writer }) => {
      const lastMessageId = isAssistantToolResult
        ? lastDbMessage?.id
        : undefined;

      for await (const part of toAISdkFormat(stream, {
        from: "agent",
        lastMessageId,
      }) as any) {
        writer.write(part);
      }

      // Get usage from stream
      const requestUsage = await stream.usage.catch(() => {
        console.log("cannot track usage");
        return null;
      });

      // Stop if usage is not available
      if (!requestUsage) {
        return;
      }

      let finalRequestUsage: AppUsage | null = null;

      // Enrich usage with tokenlens for storage
      try {
        const model = await chatAgent.getModel();
        finalRequestUsage = await enrichUsageWithTokenlens(
          model.modelId,
          requestUsage
        );
      } catch {
        console.log("cannot enrich usage");
      }

      if (finalRequestUsage) {
        // Save usage to DB
        await updateChatLastContextById({
          chatId,
          context: finalRequestUsage,
        });

        // Send usage to stream
        writer.write({
          type: "data-usage",
          data: finalRequestUsage,
        });
      }
    },
    onFinish: async ({ responseMessage }) => {
      if (isAssistantToolResult) {
        await updateMessageParts({
          messageId: message.id,
          parts: responseMessage.parts,
        });
      } else {
        await saveMessages({
          messages: [
            {
              chatId,
              id: responseMessage.id,
              role: responseMessage.role,
              parts: responseMessage.parts,
              attachments: [],
              createdAt: new Date(),
            },
          ],
        });
      }
    },
  });
}

/** Gets or creates the global resumable stream context */
export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

/** Handles chat requests: validates, authenticates, and streams AI responses */
export async function POST(request: Request) {
  // 1. Validate request
  const requestBody = await validateRequest(request);
  if (requestBody instanceof Response) {
    return requestBody;
  }

  try {
    const {
      id,
      message,
      runtimeConfig,
      selectedVisibilityType,
      tools,
      agentId,
    } = requestBody;

    // 2. Authenticate session
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // 3. Check rate limits
    const rateLimitResponse = await checkRateLimits(
      session.user.id,
      session.user.type
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 4. Setup agents and context
    const { longitude, latitude, city, country } = geolocation(request);
    // Use dynamic agent selection based on request, default to chatAgent
    const selectedAgentId = agentId || "chatAgent";
    const chatAgent = mastra.getAgent(selectedAgentId);
    const runtimeContext = createToolContext(session, {
      geoHints: { longitude, latitude, city, country },
      config: runtimeConfig,
    });

    // 5. Handle message based on type
    let uiMessages: ChatMessage[];
    let lastDbMessage: DBMessage | undefined;
    let isAssistantToolResult = false;

    if (message.role === "user") {
      const { messagesFromDb } = await handleUserMessage({
        id,
        message,
        session,
        selectedVisibilityType,
        chatAgent,
      });
      uiMessages = [...convertToUIMessages(messagesFromDb), message];
    } else {
      // Assistant messages
      const chat = await getChatById({ id });
      if (!chat) {
        return new ChatSDKError("bad_request:api").toResponse();
      }
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }

      const messagesFromDb = await getMessagesByChatId({ id });
      const result = await handleAssistantMessage({
        message: message as ChatMessage,
        messagesFromDb,
      });
      uiMessages = result.uiMessages;
      lastDbMessage = result.lastDbMessage;
      isAssistantToolResult = true;
    }

    // 6. Create and return stream
    const streamId = generateUUID();
    const uiMessageStream = await createChatStream({
      uiMessages,
      isAssistantToolResult,
      lastDbMessage,
      streamId,
      chatId: id,
      runtimeContext,
      tools,
      chatAgent,
      message: message as ChatMessage,
    });

    return createUIMessageStreamResponse({
      stream: uiMessageStream,
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

/** Deletes a chat and all its messages */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
