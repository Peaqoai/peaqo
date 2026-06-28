"use client";

import { useMemo, useState } from "react";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Cpu, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { DataTable } from "@/components/data-table";
import { ModelFormDialog, type ModelDraft } from "@/components/model-form-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type Row = {
  _id: string;
  provider: string;
  modelId: string;
  displayName: string;
  description?: string;
  inputPrice?: number;
  outputPrice?: number;
  reasoning?: boolean;
  enabled: boolean;
};

const PROVIDERS = ["openai", "anthropic", "google", "groq", "openrouter", "cloudflare"];
const selectCls = "border-border bg-background h-9 rounded-md border px-2 text-sm";

export default function AdminModelsPage() {
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModelDraft | undefined>(undefined);

  const utils = trpc.useUtils();
  const query = trpc.admin.models.listPaginated.useQuery({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    provider: (provider || undefined) as never,
  });
  const invalidate = () => utils.admin.models.listPaginated.invalidate();

  const setEnabled = trpc.admin.models.setEnabled.useMutation({ onSuccess: invalidate });
  const remove = trpc.admin.models.remove.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success("Model deleted");
    },
  });

  function onFilter(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    };
  }

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    setDialogOpen(true);
  }

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        header: "Name",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.displayName}</div>
            {row.original.description && (
              <div className="text-muted-foreground max-w-xs truncate text-xs">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        header: "Provider",
        cell: ({ row }) => <Badge variant="secondary">{row.original.provider}</Badge>,
      },
      {
        header: "Model ID",
        cell: ({ row }) => (
          <code className="text-muted-foreground text-xs">{row.original.modelId}</code>
        ),
      },
      {
        header: "Enabled",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.original.enabled}
              onCheckedChange={(v: boolean) =>
                setEnabled.mutate({ id: row.original._id, enabled: v })
              }
            />
            {row.original.reasoning && <Badge variant="outline">Reasoning</Badge>}
          </div>
        ),
      },
      {
        header: "Pricing (per 1M)",
        cell: ({ row }) => (
          <div className="text-sm">
            <div>${(row.original.inputPrice ?? 0).toFixed(2)} in</div>
            <div>${(row.original.outputPrice ?? 0).toFixed(2)} out</div>
          </div>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete ${row.original.displayName}?`)) {
                  remove.mutate({ id: row.original._id });
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [setEnabled, remove],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-muted grid size-10 place-items-center rounded-lg">
            <Cpu className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Models</h1>
            <p className="text-muted-foreground text-sm">
              Manage AI models available in the system
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add Model
        </Button>
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
              placeholder="Search models…"
              value={search}
              onChange={(e) => onFilter(setSearch)(e.target.value)}
              className="max-w-sm"
            />
            <select
              className={selectCls}
              value={provider}
              onChange={(e) => onFilter(setProvider)(e.target.value)}
            >
              <option value="">All Provider</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <ModelFormDialog
        key={`${editing?._id ?? "new"}-${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        model={editing}
      />
    </div>
  );
}
