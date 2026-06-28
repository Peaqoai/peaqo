"use client";

import { useMemo, useState } from "react";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Gateway = { _id: string; name: string; url: string };

export default function AdminGatewaysPage() {
  const utils = trpc.useUtils();
  const gateways = trpc.admin.gateways.list.useQuery();
  const all = (gateways.data ?? []) as unknown as Gateway[];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [addOpen, setAddOpen] = useState(false);

  const deleteGateway = trpc.admin.gateways.delete.useMutation({
    onSuccess: () => {
      utils.admin.gateways.list.invalidate();
      toast.success("Gateway deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const columns = useMemo<ColumnDef<Gateway, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.url}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteGateway.mutate({ id: row.original._id })}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deleteGateway],
  );

  const page = all.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gateways</h1>
        <p className="text-muted-foreground text-sm">
          Manage AI gateways and import their models.
        </p>
      </div>

      <DataTable<Gateway>
        columns={columns}
        data={page}
        total={all.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={gateways.isLoading}
        toolbar={
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Add Gateway
            </Button>
          </div>
        }
      />

      <ImportCard gateways={all} />

      <AddGatewayDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function AddGatewayDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const create = trpc.admin.gateways.create.useMutation({
    onSuccess: () => {
      utils.admin.gateways.list.invalidate();
      toast.success("Gateway added");
      setName("");
      setUrl("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Gateway</DialogTitle>
          <DialogDescription>
            An OpenAI-compatible gateway base URL.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>URL</Label>
            <Input
              placeholder="https://gateway.ai.cloudflare.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name || !url || create.isPending}
            onClick={() => create.mutate({ name, url })}
          >
            {create.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportCard({ gateways }: { gateways: Gateway[] }) {
  const utils = trpc.useUtils();
  const selectCls =
    "border-border bg-background h-9 rounded-md border px-2 text-sm";
  const [gatewayId, setGatewayId] = useState("");
  const [search, setSearch] = useState("");

  const envStatus = trpc.admin.models.envStatus.useQuery();
  const models = trpc.admin.models.listFromGateway.useQuery(
    { gatewayId },
    { enabled: !!gatewayId, retry: false },
  );
  const toggleModel = trpc.admin.models.toggleModel.useMutation({
    onSuccess: () => {
      utils.admin.models.listPaginated.invalidate();
      toast.success("Model enabled");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (models.data ?? []).filter((m) =>
    m.modelId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import models from a gateway</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {envStatus.data && !envStatus.data.gatewayKey && (
          <p className="text-muted-foreground text-sm">
            Set GATEWAY_API_KEY in env to list models from a gateway.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">Gateway</Label>
            <select
              className={selectCls}
              value={gatewayId}
              onChange={(e) => setGatewayId(e.target.value)}
            >
              <option value="">Select gateway…</option>
              {gateways.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid flex-1 gap-1">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Filter models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!models.data}
            />
          </div>
        </div>

        {models.isFetching && (
          <p className="text-muted-foreground text-sm">Loading models…</p>
        )}
        {models.error && (
          <p className="text-destructive text-sm">{models.error.message}</p>
        )}

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {filtered.map((m) => (
            <div
              key={m.modelId}
              className="flex items-center justify-between border-b py-1 text-sm"
            >
              <span className="flex items-center gap-2">
                {m.modelId}
                <Badge variant="secondary" className="capitalize">
                  {m.provider}
                </Badge>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!gatewayId}
                onClick={() =>
                  toggleModel.mutate({
                    provider: m.provider as never,
                    gatewayId,
                    modelId: m.modelId,
                    displayName: m.modelId,
                    enabled: true,
                  })
                }
              >
                Enable
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
