"use client";

// User-facing gallery of Personas / Characters (avatars) with create/edit via
// the shared CharacterFormDialog. Driven by callbacks so each page wires its
// own persona.* / character.* hooks.
import { useState } from "react";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@peaqo/ui/components/button";
import { Badge } from "@peaqo/ui/components/badge";
import {
  CharacterFormDialog,
  type CharItem,
  type CharValues,
} from "@/components/character-form-dialog";

export type { CharItem, CharValues };

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
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> New {noun}
        </Button>
      </header>

      <CharacterFormDialog
        kind={kind}
        models={models}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSave={onSave}
      />

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
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(it);
                        setOpen(true);
                      }}
                    >
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
