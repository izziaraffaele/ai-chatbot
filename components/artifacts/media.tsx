"use client";

import { formatDistance } from "date-fns";
import { FullscreenIcon } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";
import { imageArtifact } from "@/artifacts/image/client";
import {
  ArtifactVersionProvider,
  ChatArtifact,
  ChatArtifactAction,
  ChatArtifactActionButton,
  ChatArtifactBody,
  ChatArtifactHeader,
  useArtifactVersion,
} from "@/components/chat/artifact";
import { ImageEditor } from "@/components/image-editor";
import { useChatDocument } from "@/hooks/use-chat-document";

export const mediaArtifactDefinitions = [imageArtifact];

export const isMediaArtifact = (kind: string): kind is MediaArtifactKind =>
  ["image"].includes(kind);

/**
 * Media artifact type for view-only artifacts like images
 */
export type MediaArtifactKind = "image";

/**
 * Props for ImageArtifact component
 */
export type ImageArtifactProps = {
  documentId: string;
  kind: MediaArtifactKind;
  title: string;
  className?: string;
};

/**
 * Image Artifact Component
 *
 * View-only artifact component for displaying images with versioning support.
 * Unlike document artifacts, media artifacts don't support editing or drafts.
 */
function PureMediaArtifact({ documentId }: ImageArtifactProps) {
  const chatDocument = useChatDocument(documentId);

  return (
    <ArtifactVersionProvider
      initialIndex={-1}
      initialMode="edit"
      versions={chatDocument.entries}
    >
      <MediaArtifactContent />
    </ArtifactVersionProvider>
  );
}

/**
 * Image artifact content with versioning support
 */
function MediaArtifactContent() {
  const { currentVersion, versions, currentIndex } =
    useArtifactVersion<string>();

  if (!currentVersion) {
    return (
      <ChatArtifact>
        <ChatArtifactHeader title="Loading...">
          <div className="animate-spin">⟳</div>
        </ChatArtifactHeader>
        <ChatArtifactBody>
          <div className="flex h-64 items-center justify-center">
            <div>Loading image...</div>
          </div>
        </ChatArtifactBody>
      </ChatArtifact>
    );
  }

  const handleCopyToClipboard = () => {
    const img = new Image();
    img.src = `data:image/png;base64,${currentVersion.content}`;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        }
      }, "image/png");
    };

    toast.success("Copied image to clipboard!");
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${currentVersion.content}`;
    link.download = `${currentVersion.title || "image"}.png`;
    link.click();
    toast.success("Image downloaded!");
  };

  const versionText =
    versions.length > 1
      ? `Version ${currentIndex + 1} of ${versions.length}`
      : "Original version";

  const createdTime = currentVersion.createdAt
    ? formatDistance(new Date(currentVersion.createdAt), new Date(), {
        addSuffix: true,
      })
    : "";

  return (
    <ChatArtifact>
      <ChatArtifactHeader
        subtitle={`${versionText} • ${createdTime}`}
        title={currentVersion.title || "Image"}
      >
        <div className="flex items-center gap-2">
          <ChatArtifactActionButton
            icon={<FullscreenIcon size={18} />}
            label="Open in fullscreen"
          />
        </div>
      </ChatArtifactHeader>

      <ChatArtifactBody>
        <ImageEditor
          content={currentVersion.content}
          currentVersionIndex={currentIndex}
          isCurrentVersion={true}
          isInline={false}
          status="idle"
          title={currentVersion.title || "Image"}
        />
      </ChatArtifactBody>

      {/* Actions for view-only media artifacts */}
      <div className="flex items-center justify-between border-border border-t bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-4">
          {versions.length > 1 && (
            <>
              <ChatArtifactAction.PrevVersion />
              <ChatArtifactAction.NextVersion />
            </>
          )}
          <ChatArtifactAction.Copy onClick={handleCopyToClipboard} />
          <ChatArtifactAction.Download onClick={handleDownload} />
        </div>

        <div className="text-muted-foreground text-xs">
          Media Artifact • View-only
        </div>
      </div>
    </ChatArtifact>
  );
}

export const MediaArtifact = memo(PureMediaArtifact);
MediaArtifact.displayName = "MediaArtifact";
