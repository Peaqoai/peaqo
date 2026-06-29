"use client";

// Shared gallery + create/edit dialog for Personas and Characters (avatars).
// The two concepts are distinct but share a form, so this component is driven
// by callbacks: each page wires its own persona.* / character.* / admin.* hooks.
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CharItem = {
  _id: string;
  name: string;
  emoji?: string;
  avatarUrl?: string;
  tagline?: string;
  tone?: string;
  traits?: string[];
  description?: string;
  greeting?: string;
  defaultModelId: string;
  hue?: number;
  scope: "global" | "private";
  ownerId?: string;
};

export type CharValues = Omit<CharItem, "_id" | "scope" | "ownerId">;

const empty = (modelId: string): CharValues => ({
  name: "",
  emoji: "",
  tagline: "",
  tone: "",
  traits: [],
  description: "",
  greeting: "",
  defaultModelId: modelId,
  hue: 250,
});

export function CharacterManager({
  kind,
  title,
  subtitle,
  items,
  models,
  isLoading,
  canManage,
  onSave,
  onDelete,
  onStartChat,
}: {
  kind: "persona" | "character";
  title: string;
  subtitle: string;
  items: CharItem[];
  models: { id: string; name: string }[];
  isLoading?: boolean;
  canManage: (it: CharItem) => boolean;
  onSave: (values: CharValues, id?: string) => Promise<void>;
  onDelete: (id: string) => void;
  onStartChat?: (it: CharItem) => void;
}) {
  const isAvatar = kind === "character";
  const noun = isAvatar ? "avatar" : "persona";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CharItem | null>(null);
  const fallbackModel = models[0]?.id ?? "gpt-4o-mini";
  const [form, setForm] = useState<CharValues>(empty(fallbackModel));
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty(fallbackModel));
    setOpen(true);
  }
  function openEdit(it: CharItem) {
    setEditing(it);
    setForm({
      name: it.name,
      emoji: it.emoji ?? "",
      avatarUrl: it.avatarUrl,
      tagline: it.tagline ?? "",
      tone: it.tone ?? "",
      traits: it.traits ?? [],
      description: it.description ?? "",
      greeting: it.greeting ?? "",
      defaultModelId: it.defaultModelId,
      hue: it.hue ?? 250,
    });
    setOpen(true);
  }

  async function handleImage(file?: File) {
    if (!file) return;
    if (file.size > 700_000) return toast.error("Image too large (max ~700KB)");
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatarUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim() }, editing?._id);
      toast.success(editing ? "Saved" : `${noun.charAt(0).toUpperCase()}${noun.slice(1)} created`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const swatch = (it: { emoji?: string; avatarUrl?: string; hue?: number; name: string }) =>
    it.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={it.avatarUrl} alt={it.name} className="size-12 rounded-2xl object-cover" />
    ) : (
      <span
        className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
        style={{ background: `color-mix(in oklab, hsl(${it.hue ?? 250} 70% 55%) 22%, transparent)` }}
      >
        {it.emoji || it.name.slice(0, 1).toUpperCase()}
      </span>
    );

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New {noun}
              </Button>
            }
          />
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Edit ${noun}` : `Create ${noun}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-20 space-y-1.5">
                  <Label>Emoji</Label>
                  <Input
                    value={form.emoji}
                    maxLength={4}
                    placeholder="🙂"
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>

              {isAvatar && (
                <div className="space-y-1.5">
                  <Label>Picture</Label>
                  <div className="flex items-center gap-3">
                    {swatch({ ...form, name: form.name || "?" })}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImage(e.target.files?.[0])}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>{isAvatar ? "Who they are (tagline)" : "Role"}</Label>
                <Input
                  value={form.tagline}
                  placeholder={isAvatar ? "A 1920s jazz singer from New Orleans" : "Strategy partner"}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tone</Label>
                <Input
                  value={form.tone}
                  placeholder="Warm, witty, a little dramatic"
                  onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Traits (comma separated)</Label>
                <Input
                  value={form.traits?.join(", ") ?? ""}
                  placeholder="Curious, bold, precise"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      traits: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>{isAvatar ? "Personality & backstory" : "Background & knowledge"}</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  placeholder={
                    isAvatar
                      ? "Their history, beliefs, quirks, how they speak…"
                      : "Facts, expertise and context the assistant should draw on…"
                  }
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {isAvatar && (
                <div className="space-y-1.5">
                  <Label>Greeting (spoken first)</Label>
                  <Textarea
                    rows={2}
                    value={form.greeting}
                    placeholder="Well, well — fancy seeing you here."
                    onChange={(e) => setForm((f) => ({ ...f, greeting: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Default model</Label>
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                    value={form.defaultModelId}
                    onChange={(e) => setForm((f) => ({ ...f, defaultModelId: e.target.value }))}
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Color</Label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={form.hue ?? 250}
                    className="mt-2.5 w-full"
                    style={{ accentColor: `hsl(${form.hue ?? 250} 70% 55%)` }}
                    onChange={(e) => setForm((f) => ({ ...f, hue: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No {noun}s yet — create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it._id} className="bg-card hover:border-primary/40 rounded-2xl border p-5 transition-all">
              <div className="flex items-center gap-3">
                {swatch(it)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{it.name}</span>
                    <Badge variant={it.scope === "global" ? "secondary" : "outline"} className="shrink-0">
                      {it.scope === "global" ? "Global" : "Mine"}
                    </Badge>
                  </div>
                  {it.tagline && (
                    <div className="text-muted-foreground truncate text-xs">{it.tagline}</div>
                  )}
                </div>
              </div>
              {it.tone && <p className="text-muted-foreground mt-3 text-xs">{it.tone}</p>}
              {it.traits && it.traits.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {it.traits.map((t) => (
                    <span
                      key={t}
                      className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2">
                {onStartChat && (
                  <Button size="sm" className="flex-1" onClick={() => onStartChat(it)}>
                    <MessageSquare className="size-4" /> {isAvatar ? "Chat" : "Start chat"}
                  </Button>
                )}
                {canManage(it) && (
                  <>
                    <Button size="icon" variant="outline" aria-label="Edit" onClick={() => openEdit(it)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Delete"
                      onClick={() => onDelete(it._id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
