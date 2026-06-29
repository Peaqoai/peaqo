"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar, IconRail } from "@/components/app-sidebar";
import { ChatHeaderTitle } from "@/components/chat-header-title";
import { AuthGateModal } from "@/components/auth-gate-modal";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/ui/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // home keeps the icon rail for navigation but drops the contextual panel
  if (pathname.startsWith("/home")) {
    return (
      <TooltipProvider>
        <div className="app-bg flex h-svh overflow-hidden">
          <IconRail />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
        <AuthGateModal />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
        <AppSidebar />
        <SidebarInset className="app-bg h-svh overflow-hidden">
          <header className="border-border/60 flex h-12 shrink-0 items-center gap-2 border-b px-3">
            <SidebarTrigger />
            <Link
              href="/home"
              className="font-(family-name:--font-brand) text-lg font-semibold tracking-tight"
            >
              Peaqo
            </Link>
            <ChatHeaderTitle />
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </SidebarInset>
        <AuthGateModal />
      </SidebarProvider>
    </TooltipProvider>
  );
}
