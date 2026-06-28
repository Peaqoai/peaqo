"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Users, Boxes, Network } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/models", label: "Models", icon: Boxes },
  { href: "/admin/gateways", label: "Gateways", icon: Network },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = trpc.user.getMe.useQuery();

  useEffect(() => {
    if (me.data && me.data.role !== "admin") router.replace("/chat");
  }, [me.data, router]);

  if (me.isLoading) {
    return <div className="grid h-screen place-items-center text-sm">Loading…</div>;
  }
  if (me.data?.role !== "admin") {
    return <div className="grid h-screen place-items-center text-sm">Forbidden</div>;
  }

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      <aside className="bg-sidebar flex w-60 shrink-0 flex-col border-r p-3">
        <h2 className="px-2 pb-2 text-lg font-semibold">Admin</h2>
        <nav className="flex-1 space-y-0.5">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                  "hover:bg-sidebar-accent",
                  active && "bg-sidebar-accent font-medium",
                )}
              >
                <n.icon className="size-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/chat"
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent mt-2 flex items-center gap-2 rounded-md border-t px-2 py-2 pt-3 text-sm"
        >
          <ArrowLeft className="size-4" /> Back to chat
        </Link>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
