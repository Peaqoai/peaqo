"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
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
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
      toast.success("Chat deleted");
      if (vars.id === activeId) router.push("/chat");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => router.push("/chat")}
        >
          <Plus className="size-4" />
          New chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {list.data?.map((c) => (
                <SidebarMenuItem key={String(c._id)}>
                  <SidebarMenuButton
                    isActive={String(c._id) === activeId}
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
      <SidebarRail />
    </Sidebar>
  );
}
