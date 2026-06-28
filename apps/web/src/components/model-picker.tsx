"use client";

import { trpc } from "@/lib/trpc/client";

export function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (modelId: string) => void;
}) {
  const models = trpc.models.listEnabled.useQuery();

  // ponytail: until an admin enables models, offer one sensible default
  const options =
    models.data && models.data.length > 0
      ? models.data.map((m) => ({ modelId: m.modelId, displayName: m.displayName }))
      : [{ modelId: "gpt-4o", displayName: "GPT-4o (default)" }];

  return (
    <select
      className="border-border bg-background rounded-md border px-2 py-1 text-sm"
      value={value || options[0]?.modelId}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.modelId} value={o.modelId}>
          {o.displayName}
        </option>
      ))}
    </select>
  );
}
