"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { SidebarChatActions } from "@/components/sidebar-chat-actions";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/sidebar-history";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBranding } from "@/hooks/use-branding";
import { useTranslations } from "@/lib/i18n/use-translations";
import { Skeleton } from "./ui/skeleton";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const branding = useBranding();
  const t = useTranslations();
  const [renderRef, setRenderRef] = useState(false);

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: t("common.loading", "Deleting all chats..."),
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        router.push("/");
        setShowDeleteAllDialog(false);
        return t("sidebar.success.deleteAll", "All chats deleted successfully");
      },
      error: t("sidebar.error.deleteAll", "Failed to delete all chats"),
    });
  };

  const appTitle = branding.assistantName || "Assistant";

  useEffect(() => {
    setRenderRef(true);
  }, []);

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-r-0">
        <SidebarHeader>
          <SidebarMenu>
            <div className="flex flex-row items-center justify-between">
              {renderRef ? (
                <Link
                  className="flex flex-row items-center gap-3"
                  href="/"
                  onClick={() => {
                    setOpenMobile(false);
                  }}
                >
                  {branding.logo ? (
                    <>
                      <Image
                        alt={branding.organizationName || "Logo"}
                        className="rounded-md"
                        height={32}
                        src={branding.logo}
                        width={32}
                      />
                      <span className="cursor-pointer font-semibold text-lg hover:opacity-80">
                        {appTitle}
                      </span>
                    </>
                  ) : (
                    <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                      {appTitle}
                    </span>
                  )}
                </Link>
              ) : (
                <Skeleton className="h-8 flex-1 rounded-md" />
              )}
              <div className="flex flex-row gap-1">
                {user && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="h-8 p-1 md:h-fit md:p-2"
                        onClick={() => setShowDeleteAllDialog(true)}
                        type="button"
                        variant="ghost"
                      >
                        <TrashIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      Delete All Chats
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-8 p-1 md:h-fit md:p-2"
                      onClick={() => {
                        setOpenMobile(false);
                        router.push("/");
                        router.refresh();
                      }}
                      type="button"
                      variant="ghost"
                    >
                      <PlusIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="hidden md:block">
                    New Chat
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarChatActions />
        </SidebarFooter>
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
