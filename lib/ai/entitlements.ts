import type { UserType } from "@/app/(auth)/auth";
import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account (guest sessions)
   * Limited to 50 messages per day per session
   */
  guest: {
    maxMessagesPerDay: 50,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },

  /*
   * For users with an account
   * Limited to 200 messages per day
   */
  regular: {
    maxMessagesPerDay: 200,
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
