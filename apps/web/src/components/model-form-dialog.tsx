"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { ModelPickerDialog } from "@/components/model-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PROVIDERS = ["openai", "anthropic", "google", "groq", "openrouter", "cloudflare"] as const;
const selectCls = "border-border bg-background h-9 w-full rounded-md border px-2 text-sm";

export type ModelDraft = {
  _id?: string;
  provider?: string;
  modelId?: string;
  displayName?: string;
  description?: string;
  inputPrice?: number;
  outputPrice?: number;
  reasoning?: boolean;
  systemPrompt?: string;
  gatewayId?: string;
};

export function ModelFormDialog({
  open,
  onOpenChange,
  model,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  model?: ModelDraft;
}) {
  const editing = !!model?._id;
  const utils = trpc.useUtils();
  const gateways = trpc.admin.gateways.list.useQuery(undefined, { enabled: open });

  const [form, setForm] = useState<ModelDraft>(
    model ?? { provider: "openai", inputPrice: 0, outputPrice: 0, reasoning: false },
  );
  const set = <K extends keyof ModelDraft>(k: K, v: ModelDraft[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // model picker: list comes from the selected gateway (its stored key), provider derived
  const [pickerOpen, setPickerOpen] = useState(false);
  const canImport = !!form.gatewayId;

  const onDone = () => {
    utils.admin.models.listPaginated.invalidate();
    onOpenChange(false);
    toast.success(editing ? "Model updated" : "Model created");
  };
  const create = trpc.admin.models.create.useMutation({ onSuccess: onDone, onError: (e) => toast.error(e.message) });
  const update = trpc.admin.models.update.useMutation({ onSuccess: onDone, onError: (e) => toast.error(e.message) });
  const pending = create.isPending || update.isPending;

  function submit() {
    const payload = {
      provider: (form.provider ?? "openai") as never,
      modelId: form.modelId?.trim() ?? "",
      displayName: form.displayName?.trim() ?? "",
      description: form.description?.trim() || undefined,
      inputPrice: Number(form.inputPrice) || 0,
      outputPrice: Number(form.outputPrice) || 0,
      reasoning: !!form.reasoning,
      systemPrompt: form.systemPrompt?.trim() || undefined,
      gatewayId: form.gatewayId || undefined,
    };
    if (!payload.modelId || !payload.displayName) {
      toast.error("Name and Model ID are required");
      return;
    }
    if (editing) update.mutate({ id: model!._id!, ...payload });
    else create.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Model" : "Add New Model"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this model." : "Add a new AI model. It will be available to all users."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Gateway</Label>
            <select
              className={selectCls}
              value={form.gatewayId ?? ""}
              onChange={(e) => set("gatewayId", e.target.value)}
            >
              <option value="">No gateway (not chat-usable yet)</option>
              {gateways.data?.map((g) => (
                <option key={String(g._id)} value={String(g._id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Provider Model ID *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Select a model from the gateway"
                value={form.modelId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set("modelId", v);
                  if (!form.displayName) set("displayName", v);
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!canImport}
                onClick={() => setPickerOpen(true)}
              >
                Select model
              </Button>
            </div>
            {!form.gatewayId && (
              <p className="text-muted-foreground text-xs">
                Pick a gateway above to browse its models.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Model Name *</Label>
              <Input
                placeholder="e.g., GPT-4 Turbo"
                value={form.displayName ?? ""}
                onChange={(e) => set("displayName", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Provider *</Label>
              <select
                className={selectCls}
                value={form.provider ?? "openai"}
                onChange={(e) => set("provider", e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Input
              placeholder="e.g., Fast and efficient for code generation"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Input Price (per 1M tokens)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.inputPrice ?? 0}
                onChange={(e) => set("inputPrice", Number(e.target.value))}
              />
              <p className="text-muted-foreground text-xs">USD per 1M input tokens</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Output Price (per 1M tokens)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.outputPrice ?? 0}
                onChange={(e) => set("outputPrice", Number(e.target.value))}
              />
              <p className="text-muted-foreground text-xs">USD per 1M output tokens</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Enable Reasoning</p>
              <p className="text-muted-foreground text-xs">
                Extended thinking for Anthropic, OpenAI, and Google models
              </p>
            </div>
            <Switch
              checked={!!form.reasoning}
              onCheckedChange={(v) => set("reasoning", v)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Model-Specific Prompt (Optional)</Label>
            <Textarea
              placeholder="Enter model-specific instructions (optional)…"
              rows={5}
              maxLength={15000}
              value={form.systemPrompt ?? ""}
              onChange={(e) => set("systemPrompt", e.target.value)}
            />
            <p className="text-muted-foreground text-right text-xs">
              {form.systemPrompt?.length ?? 0} / 15,000 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : editing ? "Save Model" : "Create Model"}
          </Button>
        </DialogFooter>

        <ModelPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          gatewayId={form.gatewayId ?? ""}
          onSelect={(m) => {
            set("modelId", m.modelId);
            set("provider", m.provider);
            if (!form.displayName) set("displayName", m.modelId);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
