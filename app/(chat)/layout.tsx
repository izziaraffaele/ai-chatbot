import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/chat/streaming";
import { PFBuilderStateProvider } from "@/lib/pf-builder/state-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "../(auth)/auth";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <PFBuilderStateProvider>
        <DataStreamProvider>
          <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar user={session?.user} />
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
        </DataStreamProvider>
      </PFBuilderStateProvider>
    </>
  );
}
