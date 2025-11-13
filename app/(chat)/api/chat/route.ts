import { geolocation } from '@vercel/functions';
import { after } from 'next/server';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { auth, type UserType } from '@/app/(auth)/auth';
import { enrichUsageWithTokenlens } from '@/lib/tokenlens/integration';
import type { VisibilityType } from '@/components/visibility-selector';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { ChatModel } from '@/lib/ai/models';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from '@/lib/db/queries';
import type { DBMessage } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { AppUsage } from '@/lib/usage';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { type PostRequestBody, postRequestBodySchema } from './schema';
import { mastra } from '@/mastra';
import { createToolContext } from '@/mastra/utils/runtime-utils';
import { isProductionEnvironment } from '@/lib/constants';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { RuntimeConfig } from '@/config/runtime.schema';
import { AGENT_NAMES } from '@/mastra/agents';
import { titlePrompt } from '@/lib/ai/prompts';
import {
  convertFullStreamChunkToUIMessageStream,
  convertMastraChunkToAISDKv5,
} from '@mastra/core/stream';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL'
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log(json);
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      runtimeConfig,
      selectedVisibilityType,
      tools,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
      runtimeConfig?: Partial<RuntimeConfig>;
      tools?: Record<string, unknown>;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const { longitude, latitude, city, country } = geolocation(request);
    const chatAgent = mastra.getAgent(AGENT_NAMES.CHAT_AGENT);

    // Create runtime context with session and geolocation hints
    const runtimeContext = createToolContext(session, {
      geoHints: { longitude, latitude, city, country },
      config: runtimeConfig,
    });

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      const title = await chatAgent.generateTitleFromUserMessage({
        message,
        tracingContext: {},
        instructions:
          'Given a chat message, generate a short title.' + titlePrompt,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title: title,
        visibility: selectedVisibilityType,
      });
      // New chat - no need to fetch messages, it's empty
    }

    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    try {
      // Call Mastra agent with runtime context
      const stream = await chatAgent.stream<undefined, 'mastra'>(uiMessages, {
        runtimeContext,
        clientTools: tools,
        telemetry: {
          functionId: 'chatAgent-stream',
          isEnabled: isProductionEnvironment,
        },
        onFinish: async ({ usage }) => {
          let finalMergedUsage: AppUsage | null = null;

          try {
            const model = await chatAgent.getModel();
            finalMergedUsage = await enrichUsageWithTokenlens(
              model.modelId,
              usage
            );
          } catch {
            console.log('cannot enrich usage');
          }

          if (finalMergedUsage) {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          }
        },
      });

      let lastMessageId: string | undefined;
      if (
        uiMessages.length > 0 &&
        uiMessages[uiMessages.length - 1].role === 'assistant'
      ) {
        lastMessageId = uiMessages[uiMessages.length - 1].id;
      }

      // Transform stream into AI SDK format and create UI messages stream
      const uiMessageStream = createUIMessageStream({
        originalMessages: uiMessages,
        generateId: generateUUID,
        execute: async ({ writer }) => {
          // Manually convert chunks to preserve custom data streams
          // REASON: toAISdkFormat for some reason removes some chunks from the stream
          for await (const part of stream.fullStream) {
            const aiSDKPart = convertMastraChunkToAISDKv5({
              chunk: part,
              mode: 'stream',
            });

            const transformedChunk =
              convertFullStreamChunkToUIMessageStream<any>({
                part: aiSDKPart as any,
                sendReasoning: false,
                sendSources: false,
                sendStart: true,
                sendFinish: true,
                responseMessageId: lastMessageId,
                onError(error) {
                  return String(error);
                },
              });

            if (transformedChunk) writer.write(transformedChunk as any);
          }
        },
        onFinish: async ({ responseMessage }) => {
          await saveMessages({
            messages: [
              {
                id: responseMessage.id,
                role: responseMessage.role,
                parts: responseMessage.parts,
                createdAt: new Date(),
                chatId: id,
                attachments: [],
              },
            ],
          });
        },
      });

      // Create a Response that streams the UI message stream to the client
      return createUIMessageStreamResponse({
        stream: uiMessageStream,
      });
    } catch (agentError) {
      console.error('Mastra agent error:', {
        chatId: id,
        userId: session.user.id,
        error:
          agentError instanceof Error ? agentError.message : String(agentError),
      });

      return new ChatSDKError('offline:chat').toResponse();
    }
  } catch (error) {
    const vercelId = request.headers.get('x-vercel-id');

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        'AI Gateway requires a valid credit card on file to service requests'
      )
    ) {
      return new ChatSDKError('bad_request:activate_gateway').toResponse();
    }

    console.error('Unhandled error in chat API:', error, { vercelId });
    return new ChatSDKError('offline:chat').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
