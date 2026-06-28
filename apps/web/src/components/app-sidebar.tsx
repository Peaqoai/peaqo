"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export function AppSidebar() {
  const router = useRouter();
  const params = useParams();
  const activeId = Array.isArray(params.id) ? params.id[0] : undefined;
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const list = trpc.conversation.list.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const remove = trpc.conversation.remove.useMutation({
    onSuccess: (_d, vars) => {
      utils.conversation.list.invalidate();
      if (vars.id === activeId) router.push("/chat");
    },
  });

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-64 shrink-0 flex-col border-r">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => router.push("/chat")}
        >
          <Plus className="size-4" />
          New chat
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {list.data?.map((c) => (
          <div
            key={String(c._id)}
            className={cn(
              "group flex items-center gap-2 rounded-md px-2 py-2 text-sm",
              "hover:bg-sidebar-accent",
              String(c._id) === activeId && "bg-sidebar-accent",
            )}
          >
            <MessageSquare className="text-muted-foreground size-4 shrink-0" />
            <Link href={`/chat/${c._id}`} className="min-w-0 flex-1 truncate">
              {c.title || "New chat"}
            </Link>
            <button
              type="button"
              aria-label="Delete chat"
              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              onClick={() => remove.mutate({ id: String(c._id) })}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {session?.user && list.data?.length === 0 && (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            No chats yet.
          </p>
        )}
      </nav>

      <div className="border-t p-2">
        <UserMenu />
      </div>
    </aside>
  );
}
