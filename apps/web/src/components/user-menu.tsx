"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, User as UserIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { useGate } from "@/lib/use-require-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_AVATAR_BYTES = 512 * 1024; // ~512KB before base64 inflation

export function UserMenu() {
  const router = useRouter();
  const setGateOpen = useGate((s) => s.setOpen);
  const { data: session } = authClient.useSession();
  const me = trpc.user.getMe.useQuery(undefined, { enabled: !!session?.user });
  const [accountOpen, setAccountOpen] = useState(false);

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
          <DropdownMenuLabel className="truncate">{u?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAccountOpen(true)}>
            <UserIcon className="size-4" /> Account
          </DropdownMenuItem>
          {u?.role === "admin" && (
            <DropdownMenuItem onClick={() => router.push("/admin/models")}>
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

      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}

function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
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
  const used = u?.creditsUsed ?? 0;
  const limit = u?.creditsLimit ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Manage your profile and credits.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {u?.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
            <AvatarFallback>{(u?.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{u?.name}</p>
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
        <div className="bg-muted rounded-md p-3 text-sm">
          <div className="flex justify-between">
            <span className="capitalize">{u?.plan} plan</span>
            <span className="text-muted-foreground">
              {used} / {limit} credits used
            </span>
          </div>
          <div className="bg-background mt-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full"
              style={{ width: `${limit ? Math.min((used / limit) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
