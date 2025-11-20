import type { ChatMessage } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export const ChatAvatar = ({
  for: role,
  profile,
  fallbackSeed = profile?.displayName || role,
  fallbackMode = role === "assistant" ? "image" : "initials",
  ...others
}: Omit<React.ComponentProps<typeof Avatar>, "role"> & {
  for: ChatMessage["role"];
  fallbackSeed?: string;
  profile?: {
    displayName?: string;
    avatar?: React.ReactNode;
    avatarUrl?: string;
  };
  fallbackMode?: "image" | "initials";
}) => {
  const displayName = profile?.displayName || role;
  const displayInitials = displayName.includes(" ")
    ? displayName
        .split(" ")
        .map((name) => name[0])
        .join("")
    : displayName.slice(0, 2);

  let displayImage = profile?.avatar ? (
    typeof profile.avatar === "string" ? (
      <AvatarImage src={profile.avatar} title={displayName} />
    ) : (
      profile.avatar
    )
  ) : null;

  if (fallbackMode === "image") {
    displayImage = (
      <AvatarImage
        src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${fallbackSeed}`}
        title={displayName}
      />
    );
  }

  return (
    <Avatar data-role={role} data-slot="chat-avatar" {...others}>
      {displayImage}
      {fallbackMode === "initials" && (
        <AvatarFallback>{displayInitials.toUpperCase()}</AvatarFallback>
      )}
    </Avatar>
  );
};
