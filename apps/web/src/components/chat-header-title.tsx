"use client";

import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const SECTION_TITLES: { test: RegExp; title: string }[] = [
  { test: /^\/personas/, title: "Persona chat" },
  { test: /^\/fiesta/, title: "Chat fiesta" },
  { test: /^\/images/, title: "Image studio" },
  { test: /^\/video/, title: "Video studio" },
  { test: /^\/music/, title: "Music studio" },
  { test: /^\/home/, title: "Home" },
  { test: /^\/chat-history/, title: "Chat history" },
];

function Title({ children }: { children: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
      <span className="text-muted-foreground/40">/</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ChatHeaderTitle() {
  const pathname = usePathname();
  const chatId = pathname.match(/^\/chat\/([^/]+)/)?.[1];

  // active conversation — shares the cache key with the chat page's get()
  const { data } = trpc.conversation.get.useQuery({ id: chatId! }, { enabled: !!chatId });

  if (chatId) {
    const title = (data as { title?: string } | null | undefined)?.title;
    return <Title>{title || "New chat"}</Title>;
  }

  const title =
    SECTION_TITLES.find((t) => t.test.test(pathname))?.title ??
    (pathname.startsWith("/chat") ? "Chat" : "");
  if (!title) return null;
  return <Title>{title}</Title>;
}
