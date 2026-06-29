"use client";

import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export function ChatHeaderTitle() {
  const id = usePathname().match(/^\/chat\/([^/]+)/)?.[1];
  // shares the cache key with the chat page's own get() — no extra request
  const { data } = trpc.conversation.get.useQuery({ id: id! }, { enabled: !!id });
  const title = (data as { title?: string } | null | undefined)?.title;
  if (!title) return null;
  return <span className="truncate text-sm font-medium">{title}</span>;
}
