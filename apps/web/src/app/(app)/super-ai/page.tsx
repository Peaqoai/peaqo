"use client";

import { useState } from "react";
import { Rocket as RocketIcon, Columns3 as Columns3Icon, ChevronDownIcon } from "lucide-react";
import { cn } from "@peaqo/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@peaqo/ui/components/dropdown-menu";
import { SuperFiestaView } from "@/components/super-fiesta-view";
import { MultiChatView } from "@/components/multi-chat-view";

type Mode = "super-fiesta" | "multi-chat";

const MODES: { id: Mode; label: string; icon: typeof RocketIcon; blurb: string }[] = [
  {
    id: "super-fiesta",
    label: "Super Fiesta",
    icon: RocketIcon,
    blurb: "One merged answer from many models",
  },
  {
    id: "multi-chat",
    label: "Multi Chat",
    icon: Columns3Icon,
    blurb: "Compare models side by side",
  },
];

export default function SuperAiPage() {
  const [mode, setMode] = useState<Mode>("super-fiesta");
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold">
            <current.icon className="text-primary size-4" />
            {current.label}
            <ChevronDownIcon className="size-4 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {MODES.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn("flex items-start gap-2", m.id === mode && "bg-accent")}
              >
                <m.icon className="text-primary mt-0.5 size-4" />
                <div>
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-muted-foreground text-xs">{m.blurb}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-h-0 flex-1">
        {mode === "super-fiesta" ? <SuperFiestaView /> : <MultiChatView />}
      </div>
    </div>
  );
}
