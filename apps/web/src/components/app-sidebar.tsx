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
    Drama as DramaIcon,
    UserSquare as AvatarIcon,
    Rocket as RocketIcon,
    Columns3 as Columns3Icon,
    Moon as MoonIcon,
    Sun as SunIcon,
    type LucideIcon,
} from "lucide-react";
import { useTheme } from "@peaqo/ui/theme-provider";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { UserMenu } from "@/components/user-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@peaqo/ui/components/tooltip";
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
} from "@peaqo/ui/components/sidebar";

type Section = "home" | "chat" | "images" | "video" | "music";

const SECTIONS: { id: Section; label: string; href: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", href: "/home", icon: HomeIcon },
  { id: "chat", label: "Chat", href: "/chat", icon: MessageSquare },
  // { id: "images", label: "Image studio", href: "/images", icon: ImageIcon },
  // { id: "video", label: "Video studio", href: "/video", icon: VideoIcon },
  // { id: "music", label: "Music studio", href: "/music", icon: MusicIcon },
];

function sectionOf(pathname: string): Section {
  if (pathname.startsWith("/images")) return "images";
  if (pathname.startsWith("/video")) return "video";
  if (pathname.startsWith("/music")) return "music";
  if (pathname.startsWith("/home")) return "home";
  // /chat, /chat-history, /personas, /avatars, /super-ai are all "chat" modes
  return "chat";
}

// the always-visible icon rail — also used standalone on the home page
export function IconRail() {
  const pathname = usePathname();
  const section = sectionOf(pathname);
  return (
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
      <ThemeToggle />
    </div>
  );
}

// theme switch available to everyone, including logged-out users
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = theme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground mt-auto grid size-9 place-items-center rounded-lg transition-colors"
          >
            {mounted && dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
          </button>
        }
      />
      <TooltipContent side="right">Toggle theme</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const section = sectionOf(pathname);

  return (
    <Sidebar collapsible="icon" className="overflow-hidden" {...props}>
      <div className="flex h-full w-full flex-row">
        <IconRail />
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
  // home renders its own standalone layout (no sidebar), so it never reaches here
  if (section === "home") return <ChatPanel />;
  return <ListPanel cfg={PANELS[section]} />;
}

// ── Chat: real conversation list ──
const CHAT_MODES: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Chats", href: "/chat", icon: MessageSquare },
  { label: "Persona", href: "/personas", icon: DramaIcon },
  { label: "Avatar", href: "/avatars", icon: AvatarIcon },
  { label: "Super AI", href: "/chat/super-ai", icon: RocketIcon },
  { label: "Multi Chat", href: "/chat/multi", icon: Columns3Icon },
];

// "/chat" matches real chats + avatar chats, but NOT the /chat/super-ai and
// /chat/multi sub-modes (which have their own entries) or /chat-history.
const modeActive = (href: string, pathname: string) => {
  if (href === "/chat")
    return (
      pathname === "/chat" ||
      (pathname.startsWith("/chat/") &&
        !pathname.startsWith("/chat/super-ai") &&
        !pathname.startsWith("/chat/multi"))
    );
  return pathname === href || pathname.startsWith(`${href}/`);
};

// route by mode: Super AI sessions reopen under /chat/super-ai/<id> or
// /chat/multi/<id>; avatar chats at /chat/avatar/<id>; else /chat/<id>
const chatHref = (c: { _id: unknown; characterId?: unknown; mode?: unknown }) => {
  if (c.mode === "super-fiesta") return `/chat/super-ai/${c._id}`;
  if (c.mode === "multi-chat") return `/chat/multi/${c._id}`;
  return c.characterId ? `/chat/avatar/${c._id}` : `/chat/${c._id}`;
};

function ChatPanel() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const seg = Array.isArray(params.id) ? params.id : [];
  const activeId = seg[0] === "avatar" ? seg[1] : seg[0];
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
          <SidebarGroupLabel>Modes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CHAT_MODES.map((m) => (
                <SidebarMenuItem key={m.href}>
                  <SidebarMenuButton
                    isActive={modeActive(m.href, pathname)}
                    tooltip={m.label}
                    render={<Link href={m.href} />}
                  >
                    <m.icon />
                    <span>{m.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
                    render={<Link href={chatHref(c)} />}
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
const PANELS = {
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

function ListPanel({ cfg }: { cfg: (typeof PANELS)[keyof typeof PANELS] }) {
  const s = cfg;
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
