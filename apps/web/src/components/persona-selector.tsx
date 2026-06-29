"use client";

import { useState } from "react";
import { ChevronDownIcon, Drama } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@peaqo/ui/components/dropdown-menu";

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium">
        {selected?.emoji ? (
          <span className="text-base leading-none">{selected.emoji}</span>
        ) : (
          <Drama className="size-4 opacity-70" />
        )}
        <span className="max-w-[9rem] truncate">{selected?.name ?? "No persona"}</span>
        <ChevronDownIcon className="size-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup
          value={value ?? ""}
          onValueChange={(v) => {
            onChange(v || undefined);
            setOpen(false);
          }}
        >
          <DropdownMenuRadioItem value="">No persona</DropdownMenuRadioItem>
          {personas.map((p) => (
            <DropdownMenuRadioItem key={p._id} value={p._id}>
              <span className="mr-1.5">{p.emoji || "🎭"}</span>
              {p.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
