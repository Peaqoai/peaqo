"use client";

import { useMemo, useState } from "react";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Row = {
  _id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  plan?: string;
  role?: string;
  creditsUsed?: number;
  creditsLimit?: number;
};

const selectCls =
  "border-border bg-background rounded-md border px-2 py-1.5 text-sm";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [role, setRole] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const utils = trpc.useUtils();
  const query = trpc.admin.users.list.useQuery({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    plan: (plan || undefined) as never,
    role: (role || undefined) as never,
  });

  const resetCredits = trpc.admin.users.resetCredits.useMutation({
    onSuccess: () => {
      utils.admin.users.list.invalidate();
      toast.success("Credits reset");
    },
  });

  // any filter change -> back to first page
  function onFilter(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    };
  }

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        header: "User",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="size-7">
                {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
                <AvatarFallback>
                  {(u.name ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{u.name ?? "—"}</span>
            </div>
          );
        },
      },
      { header: "Email", accessorKey: "email" },
      {
        header: "Plan",
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.plan ?? "free"}
          </Badge>
        ),
      },
      {
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={row.original.role === "admin" ? "default" : "outline"}>
            {row.original.role ?? "user"}
          </Badge>
        ),
      },
      {
        header: "Credits",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <span className="text-sm">
              {u.creditsUsed ?? 0} / {u.creditsLimit ?? 0}
            </span>
          );
        },
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={resetCredits.isPending}
            onClick={() => resetCredits.mutate({ userId: row.original._id })}
          >
            Reset credits
          </Button>
        ),
      },
    ],
    [resetCredits],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Browse, filter and manage user accounts.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={(query.data?.rows ?? []) as Row[]}
        total={query.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={query.isLoading}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => onFilter(setSearch)(e.target.value)}
              className="max-w-xs"
            />
            <select
              className={selectCls}
              value={plan}
              onChange={(e) => onFilter(setPlan)(e.target.value)}
            >
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="ultimate">Ultimate</option>
              <option value="team">Team</option>
            </select>
            <select
              className={selectCls}
              value={role}
              onChange={(e) => onFilter(setRole)(e.target.value)}
            >
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
