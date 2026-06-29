"use client";

import Link from "next/link";
import { MessageSquare, ImageIcon, VideoIcon, MusicIcon, ChevronRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";

const QUICKS = [
  {
    label: "New chat",
    sub: "Any model",
    href: "/chat",
    icon: MessageSquare,
    hue: "var(--primary)",
  },
  {
    label: "Generate image",
    sub: "5 image models",
    href: "/images",
    icon: ImageIcon,
    hue: "#e879a6",
  },
  {
    label: "Make a video",
    sub: "Veo, Sora, Kling",
    href: "/video",
    icon: VideoIcon,
    hue: "#5ec6d6",
  },
  {
    label: "Make music",
    sub: "Suno, Udio, MusicGen",
    href: "/music",
    icon: MusicIcon,
    hue: "#f6b352",
  },
];

export default function HomePage() {
  const { data: session } = authClient.useSession();
  const me = trpc.user.getMe.useQuery(undefined, { enabled: !!session?.user });
  const list = trpc.conversation.list.useQuery(undefined, { enabled: !!session?.user });

  const firstName = (me.data?.name ?? session?.user?.name ?? "").split(" ")[0];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <header className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Every model, one canvas — chat, generate images, and create video from a single place.
          </p>
        </header>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICKS.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="bg-card hover:border-primary/40 group flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
            >
              <span
                className="grid size-11 shrink-0 place-items-center rounded-xl"
                style={{ background: `color-mix(in oklab, ${q.hue} 18%, transparent)`, color: q.hue }}
              >
                <q.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{q.label}</div>
                <div className="text-muted-foreground text-xs">{q.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-card rounded-2xl border">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
              Recent conversations
            </h2>
            <Link
              href="/chat-history"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
            >
              See all <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <div className="divide-y">
            {list.data?.slice(0, 6).map((c) => (
              <Link
                key={String(c._id)}
                href={`/chat/${c._id}`}
                className="hover:bg-accent/50 flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg">
                  <MessageSquare className="size-4" />
                </span>
                <span className="truncate text-sm font-medium">{c.title || "New chat"}</span>
              </Link>
            ))}
            {list.data?.length === 0 && (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                No conversations yet — start a{" "}
                <Link href="/chat" className="text-primary font-medium">
                  new chat
                </Link>
                .
              </p>
            )}
            {!session?.user && (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                Sign in to see your conversations.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
