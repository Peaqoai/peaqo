"use client";

import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const SECTION_TITLES: { test: RegExp; title: string }[] = [
  { test: /^\/personas/, title: "Persona" },
  { test: /^\/avatars/, title: "Avatar" },
  { test: /^\/fiesta/, title: "Fiesta" },
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
  // avatar chats live at /chat/avatar/<id> — the id is a conversation id once
  // started, or a character id beforehand
  const avatarId = pathname.match(/^\/chat\/avatar\/([^/]+)/)?.[1];
  const chatId = avatarId ?? pathname.match(/^\/chat\/([^/]+)/)?.[1];

  // active conversation — shares the cache key with the chat page's get()
  const { data } = trpc.conversation.get.useQuery({ id: chatId! }, { enabled: !!chatId });
  // not-yet-started avatar chat: no conversation exists, so fall back to the
  // character's name for the header
  const { data: char } = trpc.character.get.useQuery(
    { id: avatarId! },
    { enabled: !!avatarId },
  );

  if (chatId) {
    const title = (data as { title?: string } | null | undefined)?.title;
    const charName = (char as { name?: string } | null | undefined)?.name;
    return (
      <Title>
        {(title && title !== "New chat" ? title : null) ??
          (charName ? `Chat with ${charName}` : "New chat")}
      </Title>
    );
  }

  const title =
    SECTION_TITLES.find((t) => t.test.test(pathname))?.title ??
    (pathname.startsWith("/chat") ? "Chat" : "");
  if (!title) return null;
  return <Title>{title}</Title>;
}
