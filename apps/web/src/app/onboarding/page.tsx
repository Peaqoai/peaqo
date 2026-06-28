"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Plan = "free" | "pro" | "ultimate" | "team";

const PLANS: { id: Plan; name: string; price: string; credits: string; team: boolean }[] = [
  { id: "free", name: "Free", price: "$0", credits: "10 credits/mo", team: false },
  { id: "pro", name: "Pro", price: "$19/mo", credits: "2,000 credits/mo", team: true },
  { id: "ultimate", name: "Ultimate", price: "$49/mo", credits: "6,000 credits/mo", team: true },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [orgName, setOrgName] = useState("");
  const [invites, setInvites] = useState("");

  const completeProfile = trpc.onboarding.completeProfile.useMutation();
  const selectPlan = trpc.onboarding.selectPlan.useMutation();
  const setupTeam = trpc.onboarding.setupTeam.useMutation();
  const finish = trpc.onboarding.finish.useMutation();

  const hasTeam = PLANS.find((p) => p.id === plan)?.team ?? false;

  async function submitProfile() {
    await completeProfile.mutateAsync({
      name,
      avatarUrl: avatarUrl || undefined,
    });
    setStep(2);
  }

  async function submitPlan() {
    await selectPlan.mutateAsync({ plan });
    if (hasTeam) setStep(3);
    else {
      await finish.mutateAsync();
      router.push("/chat");
    }
  }

  async function submitTeam(skip: boolean) {
    if (!skip) {
      await setupTeam.mutateAsync({
        orgName,
        invites: invites
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } else {
      await finish.mutateAsync();
    }
    router.push("/chat");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Peaqo</CardTitle>
          <CardDescription>Step {step} of {hasTeam ? 3 : 2}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === 1 && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatar">Avatar URL (optional)</Label>
                <Input
                  id="avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
              <Button onClick={submitProfile} disabled={!name || completeProfile.isPending}>
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={`rounded-lg border p-3 text-left ${
                      plan === p.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <div className="flex justify-between font-medium">
                      <span>{p.name}</span>
                      <span>{p.price}</span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {p.credits}
                      {p.team ? " · team features" : ""}
                    </div>
                  </button>
                ))}
              </div>
              <Button onClick={submitPlan} disabled={selectPlan.isPending}>
                Continue
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="org">Organisation name</Label>
                <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invites">Invite members (comma-separated emails)</Label>
                <Input
                  id="invites"
                  value={invites}
                  onChange={(e) => setInvites(e.target.value)}
                  placeholder="a@x.com, b@y.com"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => submitTeam(true)}
                  disabled={finish.isPending}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => submitTeam(false)}
                  disabled={!orgName || setupTeam.isPending}
                >
                  Create team
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
