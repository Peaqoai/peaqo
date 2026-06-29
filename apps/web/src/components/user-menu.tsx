"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Shield,
  User as UserIcon,
  Upload,
  Moon,
  Sun,
  Paintbrush,
  CreditCard,
} from "lucide-react";
import { useTheme } from "@repo/ui/theme-provider";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { useGate } from "@/lib/use-require-auth";
import { Button } from "@repo/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@repo/ui/components/sidebar";

const MAX_AVATAR_BYTES = 512 * 1024; // ~512KB before base64 inflation

export function UserMenu() {
  const router = useRouter();
  const setGateOpen = useGate((s) => s.setOpen);
  const { data: session } = authClient.useSession();
  const me = trpc.user.getMe.useQuery(undefined, { enabled: !!session?.user });
  const [accountOpen, setAccountOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // server + first client render must match; auth state is only known client-side
  if (!mounted) {
    return <div className="h-12 rounded-md" />;
  }

  if (!session?.user) {
    return (
      <Button className="w-full" onClick={() => setGateOpen(true)}>
        Log in
      </Button>
    );
  }

  const u = me.data;
  const initials = (u?.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md p-2 text-left">
          <Avatar className="size-8">
            {u?.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{u?.name ?? "…"}</p>
            <p className="text-muted-foreground truncate text-xs capitalize">
              {u?.plan ?? "free"} ·{" "}
              {u ? `${Math.max(u.creditsLimit - u.creditsUsed, 0)} credits` : "…"}
            </p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="text-muted-foreground truncate px-2 py-1.5 text-sm">
            {u?.email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAccountOpen(true)}>
            <UserIcon className="size-4" /> Settings
          </DropdownMenuItem>
          {u?.role === "admin" && (
            <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
              <Shield className="size-4" /> Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              authClient.signOut().then(() => router.push("/login"))
            }
          >
            <LogOut className="size-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}

const SECTIONS = [
  { id: "account", name: "Account", icon: UserIcon },
  { id: "appearance", name: "Appearance", icon: Paintbrush },
  { id: "billing", name: "Billing", icon: CreditCard },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [section, setSection] = useState<SectionId>("account");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your profile, appearance and billing.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {SECTIONS.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={item.id === section}
                          onClick={() => setSection(item.id)}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-y-auto">
            <header className="flex h-16 shrink-0 items-center px-6">
              <h2 className="text-lg font-semibold capitalize">{section}</h2>
            </header>
            <div className="flex-1 px-6 pb-6">
              {section === "account" && <AccountSection />}
              {section === "appearance" && <AppearanceSection />}
              {section === "billing" && <BillingSection />}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}

function AccountSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const me = trpc.user.getMe.useQuery();
  const setAvatar = trpc.user.setAvatar.useMutation({
    onSuccess: () => {
      utils.user.getMe.invalidate();
      toast.success("Avatar updated");
    },
    onError: (e) => toast.error(e.message),
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image too large (max 512KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar.mutate({ dataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  const u = me.data;

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {u?.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
        <AvatarFallback>{(u?.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{u?.name}</p>
        <p className="text-muted-foreground text-sm">{u?.email}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-2"
          disabled={setAvatar.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" />
          {setAvatar.isPending ? "Uploading…" : "Change avatar"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
      </div>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div>
        <p className="font-medium">Theme</p>
        <p className="text-muted-foreground text-sm">
          Currently using {dark ? "dark" : "light"} mode.
        </p>
      </div>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {dark ? "Switch to light" : "Switch to dark"}
      </Button>
    </div>
  );
}

function BillingSection() {
  const me = trpc.user.getMe.useQuery();
  const u = me.data;
  const used = u?.creditsUsed ?? 0;
  const limit = u?.creditsLimit ?? 0;
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div className="bg-muted rounded-md p-4 text-sm">
      <div className="flex justify-between">
        <span className="capitalize">{u?.plan} plan</span>
        <span className="text-muted-foreground">
          {used} / {limit} credits used
        </span>
      </div>
      <div className="bg-background mt-2 h-2 overflow-hidden rounded-full">
        <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
