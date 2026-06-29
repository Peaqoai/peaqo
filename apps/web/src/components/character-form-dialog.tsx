"use client";

// Create/edit dialog for a Persona or Character (avatar). Controlled `open` so
// it can be driven from a gallery card, a table row, or a "New" button.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export function avatarSwatch(it: {
  emoji?: string;
  avatarUrl?: string;
  hue?: number;
  name: string;
}) {
  return it.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={it.avatarUrl} alt={it.name} className="size-9 rounded-xl object-cover" />
  ) : (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
      style={{ background: `color-mix(in oklab, hsl(${it.hue ?? 250} 70% 55%) 22%, transparent)` }}
    >
      {it.emoji || it.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function CharacterFormDialog({
  kind,
  models,
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  kind: "persona" | "character";
  models: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: CharItem | null;
  onSave: (values: CharValues, id?: string) => Promise<void>;
}) {
  const isAvatar = kind === "character";
  const noun = isAvatar ? "avatar" : "persona";
  const fallbackModel = models[0]?.id ?? "gpt-4o-mini";
  const [form, setForm] = useState<CharValues>(empty(fallbackModel));
  const [saving, setSaving] = useState(false);

  // (re)seed the form whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            name: editing.name,
            emoji: editing.emoji ?? "",
            avatarUrl: editing.avatarUrl,
            tagline: editing.tagline ?? "",
            tone: editing.tone ?? "",
            traits: editing.traits ?? [],
            description: editing.description ?? "",
            greeting: editing.greeting ?? "",
            defaultModelId: editing.defaultModelId,
            hue: editing.hue ?? 250,
          }
        : empty(fallbackModel),
    );
  }, [open, editing, fallbackModel]);

  function handleImage(file?: File) {
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
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${noun}` : `Create ${noun}`}</DialogTitle>
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
                {avatarSwatch({ ...form, name: form.name || "?" })}
                <Input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} />
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
