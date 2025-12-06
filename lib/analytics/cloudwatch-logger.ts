/**
 * CloudWatch Interaction Logger
 *
 * Logs user interactions with the chatbot to AWS CloudWatch Logs
 * for analytics and monitoring purposes.
 */

import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  ResourceAlreadyExistsException,
} from "@aws-sdk/client-cloudwatch-logs";
import { isProductionEnvironment } from "@/lib/constants";

const LOG_GROUP_NAME = "/hfarm/interactions";

/** Interaction event data structure */
export type ChatInteraction = {
  userId: string;
  userType: "guest" | "regular";
  chatId: string;
  messageId: string;
  messageRole: "user" | "assistant";
  agentId: string;
  timestamp: string;
  /** Optional: user's geographic location */
  geoHints?: {
    city?: string;
    country?: string;
  };
};

/** Singleton CloudWatch client */
let cloudWatchClient: CloudWatchLogsClient | null = null;

/** Cache of created log streams */
const createdLogStreams = new Set<string>();

/**
 * Get or create the CloudWatch Logs client
 */
function getCloudWatchClient(): CloudWatchLogsClient | null {
  if (!isProductionEnvironment) {
    return null;
  }

  if (!process.env.AWS_REGION) {
    console.warn("[Analytics] AWS_REGION not set, CloudWatch logging disabled");
    return null;
  }

  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchLogsClient({
      region: process.env.AWS_REGION,
    });
  }

  return cloudWatchClient;
}

/**
 * Get today's log stream name (one stream per day)
 */
function getLogStreamName(): string {
  const today = new Date().toISOString().split("T")[0];
  return `chat-interactions-${today}`;
}

/**
 * Ensure the log stream exists, creating it if necessary
 */
async function ensureLogStreamExists(
  client: CloudWatchLogsClient,
  logStreamName: string
): Promise<void> {
  if (createdLogStreams.has(logStreamName)) {
    return;
  }

  try {
    await client.send(
      new CreateLogStreamCommand({
        logGroupName: LOG_GROUP_NAME,
        logStreamName,
      })
    );
    createdLogStreams.add(logStreamName);
  } catch (error) {
    if (error instanceof ResourceAlreadyExistsException) {
      createdLogStreams.add(logStreamName);
      return;
    }
    throw error;
  }
}

/**
 * Log a chat interaction to CloudWatch Logs
 *
 * This function is fire-and-forget and will not throw errors
 * to avoid disrupting the chat flow.
 */
export async function logChatInteraction(
  interaction: ChatInteraction
): Promise<void> {
  const client = getCloudWatchClient();
  if (!client) {
    // Log locally in development
    if (!isProductionEnvironment) {
      console.log("[Analytics] Chat interaction:", interaction);
    }
    return;
  }

  const logStreamName = getLogStreamName();

  try {
    await ensureLogStreamExists(client, logStreamName);

    await client.send(
      new PutLogEventsCommand({
        logGroupName: LOG_GROUP_NAME,
        logStreamName,
        logEvents: [
          {
            timestamp: Date.now(),
            message: JSON.stringify(interaction),
          },
        ],
      })
    );
  } catch (error) {
    // Don't throw - just log the error and continue
    console.error(
      "[Analytics] Failed to log interaction to CloudWatch:",
      error
    );
  }
}

/**
 * Log multiple interactions in a batch (more efficient for high volume)
 */
export async function logChatInteractionsBatch(
  interactions: ChatInteraction[]
): Promise<void> {
  const client = getCloudWatchClient();
  if (!client || interactions.length === 0) {
    return;
  }

  const logStreamName = getLogStreamName();

  try {
    await ensureLogStreamExists(client, logStreamName);

    await client.send(
      new PutLogEventsCommand({
        logGroupName: LOG_GROUP_NAME,
        logStreamName,
        logEvents: interactions.map((interaction) => ({
          timestamp: Date.now(),
          message: JSON.stringify(interaction),
        })),
      })
    );
  } catch (error) {
    console.error(
      "[Analytics] Failed to log interactions batch to CloudWatch:",
      error
    );
  }
}
