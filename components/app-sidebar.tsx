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
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
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

/**
 * H-FARM Styled App Sidebar
 * Sophisticated Academic - clean, professional navigation
 */
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
      loading: t("common.loading", "Eliminazione chat in corso..."),
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        router.push("/");
        setShowDeleteAllDialog(false);
        return t("sidebar.success.deleteAll", "Chat eliminate con successo");
      },
      error: t("sidebar.error.deleteAll", "Errore durante l'eliminazione"),
    });
  };

  const appTitle = branding.assistantName || "Assistant";

  useEffect(() => {
    setRenderRef(true);
  }, []);

  return (
    <>
      {/* H-FARM Sidebar - cream background, subtle border */}
      <Sidebar className="group-data-[side=left]:border-r group-data-[side=left]:border-border">
        <SidebarHeader className="border-b border-border/50 pb-4">
          <SidebarMenu>
            <div className="flex flex-row items-center justify-between">
              {renderRef ? (
                <Link
                  className="group flex flex-row items-center gap-3 transition-opacity hover:opacity-80"
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
                      <span className="font-semibold text-lg tracking-tight text-foreground">
                        {appTitle}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-lg tracking-tight text-foreground">
                      {appTitle}
                    </span>
                  )}
                </Link>
              ) : (
                <Skeleton className="h-8 flex-1 rounded-md" />
              )}
              
              {/* Action buttons - H-FARM subtle style */}
              <div className="flex flex-row gap-1">
                {user && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={() => setShowDeleteAllDialog(true)}
                        type="button"
                        variant="ghost"
                      >
                        <TrashIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      Elimina tutte le chat
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
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
                    Nuova chat
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenu>
        </SidebarHeader>
        
        <SidebarContent className="px-2">
          <SidebarHistory user={user} />
        </SidebarContent>
        
        <SidebarFooter className="border-t border-border/50 pt-2">
          {user && <SidebarUserNav user={user} />}
        </SidebarFooter>
      </Sidebar>

      {/* Delete confirmation dialog - H-FARM styled */}
      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold tracking-tight">
              Eliminare tutte le chat?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Questa azione non può essere annullata. Tutte le chat verranno
              eliminate definitivamente dai nostri server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAll}
            >
              Elimina tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
