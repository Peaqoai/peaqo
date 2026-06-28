"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PickedModel = { modelId: string; provider: string };

export function ModelPickerDialog({
  open,
  onOpenChange,
  gatewayId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  gatewayId: string;
  onSelect: (m: PickedModel) => void;
}) {
  const models = trpc.admin.models.listFromGateway.useQuery(
    { gatewayId },
    { enabled: open && !!gatewayId, retry: false },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Select a model</DialogTitle>
          <DialogDescription>
            Models listed from the selected gateway.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList className="max-h-80">
            {models.isLoading && (
              <p className="text-muted-foreground p-4 text-center text-sm">
                Loading models…
              </p>
            )}
            {models.error && (
              <p className="text-destructive p-4 text-center text-sm">
                {models.error.message}
              </p>
            )}
            {models.data && <CommandEmpty>No models found.</CommandEmpty>}
            {models.data?.map((m) => (
              <CommandItem
                key={m.modelId}
                value={m.modelId}
                onSelect={() => {
                  onSelect({ modelId: m.modelId, provider: m.provider });
                  onOpenChange(false);
                }}
              >
                <span className="truncate">{m.modelId}</span>
                <Badge variant="secondary" className="ml-auto capitalize">
                  {m.provider}
                </Badge>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
