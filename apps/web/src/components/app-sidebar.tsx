"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Plus,
    MessageSquare,
    Trash2,
    Sparkles,
    Home as HomeIcon,
    Image as ImageIcon,
    Video as VideoIcon,
    Music as MusicIcon,
    type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

type Section = "home" | "chat" | "images" | "video" | "music";

const SECTIONS: { id: Section; label: string; href: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", href: "/home", icon: HomeIcon },
  { id: "chat", label: "Chat", href: "/chat", icon: MessageSquare },
  { id: "images", label: "Image studio", href: "/images", icon: ImageIcon },
  { id: "video", label: "Video studio", href: "/video", icon: VideoIcon },
  { id: "music", label: "Music studio", href: "/music", icon: MusicIcon },
];

function sectionOf(pathname: string): Section {
  if (pathname.startsWith("/images")) return "images";
  if (pathname.startsWith("/video")) return "video";
  if (pathname.startsWith("/music")) return "music";
  if (pathname.startsWith("/home")) return "home";
  return "chat"; // /chat, /chat-history
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const section = sectionOf(pathname);

  return (
    <Sidebar collapsible="icon" className="overflow-hidden" {...props}>
      <div className="flex h-full w-full flex-row">
        {/* ── icon rail (always visible) ── */}
        <div className="bg-sidebar flex w-12 shrink-0 flex-col items-center gap-1 border-r py-2">
          <Link
            href="/home"
            aria-label="Peaqo home"
            className="brand-gradient mb-1 grid size-8 place-items-center rounded-lg text-white shadow-sm shadow-primary/30 transition-transform duration-300 hover:scale-105"
          >
            <Sparkles className="size-4" />
          </Link>
          {SECTIONS.map((s) => (
            <Tooltip key={s.id}>
              <TooltipTrigger
                render={
                  <Link
                    href={s.href}
                    aria-label={s.label}
                    data-active={section === s.id}
                    className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground grid size-9 place-items-center rounded-lg transition-colors"
                  >
                    <s.icon className="size-5" />
                  </Link>
                }
              />
              <TooltipContent side="right">{s.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* ── contextual panel ── */}
        <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
          <ContextPanel section={section} />
        </div>
      </div>
    </Sidebar>
  );
}

function ContextPanel({ section }: { section: Section }) {
  if (section === "chat") return <ChatPanel />;
  if (section === "images") return <StudioPanel kind="images" />;
  if (section === "video") return <StudioPanel kind="video" />;
  if (section === "music") return <StudioPanel kind="music" />;
  return <HomePanel />;
}

// ── Chat: real conversation list ──
function ChatPanel() {
  const router = useRouter();
  const params = useParams();
  const activeId = Array.isArray(params.id) ? params.id[0] : undefined;
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const list = trpc.conversation.list.useQuery(undefined, { enabled: !!session?.user });
  const remove = trpc.conversation.remove.useMutation({
    onSuccess: (_d, vars) => {
      utils.conversation.list.invalidate();
      toast.success("Chat deleted");
      if (vars.id === activeId) router.push("/chat");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="New chat" onClick={() => router.push("/chat")}>
              <Plus />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between pr-1">
            <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
            <Link
              href="/chat-history"
              className="text-muted-foreground hover:text-foreground px-2 text-xs font-medium transition-colors"
            >
              See all
            </Link>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {list.data?.map((c) => (
                <SidebarMenuItem key={String(c._id)}>
                  <SidebarMenuButton
                    isActive={String(c._id) === activeId}
                    tooltip={c.title || "New chat"}
                    render={<Link href={`/chat/${c._id}`} />}
                  >
                    <MessageSquare />
                    <span>{c.title || "New chat"}</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    aria-label="Delete chat"
                    showOnHover
                    onClick={() => remove.mutate({ id: String(c._id) })}
                  >
                    <Trash2 />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
              {session?.user && list.data?.length === 0 && (
                <p className="text-muted-foreground px-2 py-4 text-center text-xs">
                  No chats yet.
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </>
  );
}

// ── Image / Video studios: action + static recents ──
const STUDIO = {
  images: {
    recentLabel: "Recent Images",
    action: "New generation",
    href: "/images",
    icon: ImageIcon,
    recents: [
      "Glass prism refracting light…",
      "Isometric designer workspace…",
      "Dewdrops on a spiderweb…",
    ],
  },
  video: {
    recentLabel: "Recent Videos",
    action: "New clip",
    href: "/video",
    icon: VideoIcon,
    recents: [
      "Drone over a misty pine forest…",
      "Ink blooming in water…",
      "Paper airplane through an office…",
    ],
  },
  music: {
    recentLabel: "Recent Music",
    action: "New track",
    href: "/music",
    icon: MusicIcon,
    recents: [
      "Lo-fi beats for late-night coding…",
      "Cinematic orchestral swell…",
      "Upbeat synthwave drive…",
    ],
  },
} as const;

function StudioPanel({ kind }: { kind: "images" | "video" | "music" }) {
  const s = STUDIO[kind];
  const Icon = s.icon;
  return (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={s.action} render={<Link href={s.href} />}>
              <Plus />
              <span>{s.action}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{s.recentLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {s.recents.map((r) => (
                <SidebarMenuItem key={r}>
                  <SidebarMenuButton tooltip={r} render={<Link href={s.href} />}>
                    <Icon />
                    <span>{r}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </>
  );
}

// ── Home: quick actions + recent chats ──
function HomePanel() {
  const { data: session } = authClient.useSession();
  const list = trpc.conversation.list.useQuery(undefined, { enabled: !!session?.user });
  const quicks: { label: string; href: string; icon: LucideIcon }[] = [
    { label: "New chat", href: "/chat", icon: MessageSquare },
    { label: "Generate image", href: "/images", icon: ImageIcon },
    { label: "Make a video", href: "/video", icon: VideoIcon },
    { label: "Make music", href: "/music", icon: MusicIcon },
  ];
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <span className="font-(family-name:--font-brand) text-lg font-semibold tracking-tight">
            Peaqo
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quicks.map((q) => (
                <SidebarMenuItem key={q.label}>
                  <SidebarMenuButton tooltip={q.label} render={<Link href={q.href} />}>
                    <q.icon />
                    <span>{q.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <div className="flex items-center justify-between pr-1">
            <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
            <Link
              href="/chat-history"
              className="text-muted-foreground hover:text-foreground px-2 text-xs font-medium transition-colors"
            >
              See all
            </Link>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {list.data?.slice(0, 6).map((c) => (
                <SidebarMenuItem key={String(c._id)}>
                  <SidebarMenuButton
                    tooltip={c.title || "New chat"}
                    render={<Link href={`/chat/${c._id}`} />}
                  >
                    <MessageSquare />
                    <span>{c.title || "New chat"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </>
  );
}
