"use client";

import { useState } from "react";
import { Check, ChevronDownIcon, Drama } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@peaqo/ui/components/command";

export type PersonaOption = { _id: string; name: string; emoji?: string };

// styled to match ChatModelSelector's trigger so the composer reads as one row
export function PersonaSelector({
  value,
  onChange,
  personas,
}: {
  value?: string;
  onChange: (id?: string) => void;
  personas: PersonaOption[];
}) {
  const [open, setOpen] = useState(false);
  const selected = personas.find((p) => p._id === value);

  const select = (id?: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium"
      >
        {selected?.emoji ? (
          <span className="text-base leading-none">{selected.emoji}</span>
        ) : (
          <Drama className="size-4 opacity-70" />
        )}
        <span className="max-w-[9rem] truncate">{selected?.name ?? "No persona"}</span>
        <ChevronDownIcon className="size-4 opacity-60" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Pick a persona">
        <Command>
          <CommandInput placeholder="Search personas…" />
          <CommandList>
          <CommandEmpty>No persona found.</CommandEmpty>
          <CommandItem value="No persona" onSelect={() => select(undefined)}>
            <Drama className="size-4 opacity-70" />
            No persona
            {!value && <Check className="ml-auto size-4" />}
          </CommandItem>
          {personas.map((p) => (
            <CommandItem key={p._id} value={p.name} onSelect={() => select(p._id)}>
              <span className="text-base leading-none">{p.emoji || "🎭"}</span>
              {p.name}
              {value === p._id && <Check className="ml-auto size-4" />}
            </CommandItem>
          ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
