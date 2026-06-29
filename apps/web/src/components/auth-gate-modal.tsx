"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useGate } from "@/lib/use-require-auth";
import { Button } from "@peaqo/ui/components/button";
import { Input } from "@peaqo/ui/components/input";
import { Label } from "@peaqo/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@peaqo/ui/components/dialog";

export function AuthGateModal() {
  const open = useGate((s) => s.open);
  const setOpen = useGate((s) => s.setOpen);
  const pending = useGate((s) => s.pending);
  const setPending = useGate((s) => s.setPending);

  const [mode, setMode] = useState<"login" | "register">("login");
  // one credentials object — the three fields always travel together
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const { name, email, password } = form;
    const res =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });
    setBusy(false);

    if (res.error) {
      setError(res.error.message ?? "Something went wrong");
      return;
    }
    if (mode === "register") {
      setError("Check your email to verify your account, then continue.");
      return;
    }
    // logged in — resume the deferred action
    setOpen(false);
    const fn = pending;
    setPending(null);
    fn?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Log in to continue" : "Create an account"}
          </DialogTitle>
          <DialogDescription>
            You need an account to chat. It only takes a moment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {mode === "register" && (
            <div className="grid gap-2">
              <Label htmlFor="g-name">Name</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="g-email">Email</Label>
            <Input
              id="g-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-password">Password</Label>
            <Input
              id="g-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={submit} disabled={busy}>
            {busy ? "…" : mode === "login" ? "Log in" : "Sign up"}
          </Button>
          <button
            type="button"
            className="text-muted-foreground text-sm underline"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
