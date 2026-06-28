import { AppSidebar } from "@/components/app-sidebar";
import { AuthGateModal } from "@/components/auth-gate-modal";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="dark bg-background text-foreground flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="min-w-0 flex-1">{children}</div>
        <AuthGateModal />
      </div>
    </TooltipProvider>
  );
}
