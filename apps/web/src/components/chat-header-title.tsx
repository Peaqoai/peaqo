"use client";

import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const SECTION_TITLES: { test: RegExp; title: string }[] = [
  { test: /^\/personas/, title: "Persona" },
  { test: /^\/avatars/, title: "Avatar" },
  { test: /^\/chat\/super-ai/, title: "Super AI" },
  { test: /^\/chat\/multi/, title: "Multi Chat" },
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
  // avatar chats live at /chat/avatar/<id>; Super AI sessions at
  // /chat/super-ai/<id> and /chat/multi/<id>; the trailing id is a conversation
  // id once the session is saved
  const avatarId = pathname.match(/^\/chat\/avatar\/([^/]+)/)?.[1];
  const superId = pathname.match(/^\/chat\/(?:super-ai|multi)\/([^/]+)/)?.[1];
  // a plain /chat/<id> — exclude the named sub-routes
  const plainId = pathname.match(/^\/chat\/(?!avatar|super-ai|multi)([^/]+)/)?.[1];
  const chatId = avatarId ?? superId ?? plainId;

  // active conversation — shares the cache key with the pages' get()
  const { data } = trpc.conversation.get.useQuery({ id: chatId! }, { enabled: !!chatId });
  // not-yet-started avatar chat: no conversation exists, so fall back to the
  // character's name for the header
  const { data: char } = trpc.character.get.useQuery(
    { id: avatarId! },
    { enabled: !!avatarId },
  );

  if (chatId) {
    const title = (data as { title?: string } | null | undefined)?.title;
    if (title && title !== "New chat") return <Title>{title}</Title>;
    const charName = (char as { name?: string } | null | undefined)?.name;
    if (charName) return <Title>{`Chat with ${charName}`}</Title>;
    // fall through to the section label (e.g. "Super AI") for unsaved sessions
  }

  const title =
    SECTION_TITLES.find((t) => t.test.test(pathname))?.title ??
    (pathname.startsWith("/chat") ? "Chat" : "");
  if (!title) return null;
  return <Title>{title}</Title>;
}
