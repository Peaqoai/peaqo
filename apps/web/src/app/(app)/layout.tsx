import { AppSidebar } from "@/components/app-sidebar";
import { ChatHeaderTitle } from "@/components/chat-header-title";
import { AuthGateModal } from "@/components/auth-gate-modal";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="app-bg h-svh overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 px-3">
            <SidebarTrigger />
            <ChatHeaderTitle />
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </SidebarInset>
        <AuthGateModal />
      </SidebarProvider>
    </TooltipProvider>
  );
}
