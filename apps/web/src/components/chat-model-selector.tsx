"use client";

import { useState } from "react";
import { ChevronDownIcon, PlusIcon, XIcon } from "lucide-react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@peaqo/ui/components/ai-elements/model-selector";

export type ChatModel = { id: string; name: string; provider: string };

// our provider enum -> models.dev logo slug
const LOGO: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  groq: "groq",
  openrouter: "openrouter",
  cloudflare: "cloudflare-workers-ai",
};

// provider logo for a model, used outside the selector (e.g. collapsed columns)
export function ModelLogo({ provider }: { provider: string }) {
  return <ModelSelectorLogo provider={LOGO[provider] ?? provider} />;
}

export function ChatModelSelector({
  value,
  onChange,
  models,
}: {
  value: string;
  onChange: (id: string) => void;
  models: ChatModel[];
}) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === value) ?? models[0];

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium">
        {selected && <ModelSelectorLogo provider={LOGO[selected.provider] ?? selected.provider} />}
        {selected?.name ?? "Select model"}
        <ChevronDownIcon className="size-4 opacity-60" />
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Models">
            {models.map((m) => (
              <ModelSelectorItem
                key={m.id}
                value={m.name}
                onSelect={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <ModelSelectorLogo provider={LOGO[m.provider] ?? m.provider} />
                <ModelSelectorName>{m.name}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

// Multi-select picker: selected models shown as removable pills + an "Add model"
// dropdown listing the rest. Used by Super AI to pick which models to fan out to.
export function ModelMultiSelect({
  models,
  selected,
  onChange,
}: {
  models: ChatModel[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = models.filter((m) => !selected.includes(m.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((id) => {
        const m = models.find((x) => x.id === id);
        if (!m) return null;
        return (
          <span
            key={id}
            className="border-primary/50 bg-primary/5 flex items-center gap-1.5 rounded-lg border py-1 pl-2.5 pr-1.5 text-xs font-medium"
          >
            <ModelSelectorLogo provider={LOGO[m.provider] ?? m.provider} />
            {m.name}
            <button
              type="button"
              aria-label={`Remove ${m.name}`}
              onClick={() => onChange(selected.filter((x) => x !== id))}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </span>
        );
      })}
      {available.length > 0 && (
        <ModelSelector open={open} onOpenChange={setOpen}>
          <ModelSelectorTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1 text-xs font-medium">
            <PlusIcon className="size-3.5" /> Add model
          </ModelSelectorTrigger>
          <ModelSelectorContent>
            <ModelSelectorInput placeholder="Search models…" />
            <ModelSelectorList>
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              <ModelSelectorGroup heading="Models">
                {available.map((m) => (
                  <ModelSelectorItem
                    key={m.id}
                    value={m.name}
                    onSelect={() => {
                      onChange([...selected, m.id]);
                      setOpen(false);
                    }}
                  >
                    <ModelSelectorLogo provider={LOGO[m.provider] ?? m.provider} />
                    <ModelSelectorName>{m.name}</ModelSelectorName>
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>
      )}
    </div>
  );
}
