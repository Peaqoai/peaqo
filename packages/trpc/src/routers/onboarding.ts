import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { connectDB, UserModel, OrgModel, Plan } from "@repo/db";

const PLAN_CREDITS: Record<string, number> = {
  free: 10,
  pro: 2000,
  ultimate: 6000,
  team: 2000,
};

export const onboardingRouter = router({
  completeProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      await UserModel.findByIdAndUpdate(ctx.userId, input);
      return { ok: true };
    }),
  selectPlan: protectedProcedure
    .input(z.object({ plan: Plan }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      await UserModel.findByIdAndUpdate(ctx.userId, {
        plan: input.plan,
        creditsLimit: PLAN_CREDITS[input.plan],
      });
      return { ok: true };
    }),
  setupTeam: protectedProcedure
    .input(
      z.object({
        orgName: z.string().min(1),
        invites: z.array(z.string().email()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      const org = await OrgModel.create({
        name: input.orgName,
        ownerId: ctx.userId,
        members: [ctx.userId],
      });
      await UserModel.findByIdAndUpdate(ctx.userId, {
        orgId: org.id,
        onboardingComplete: true,
      });

      // ponytail: best-effort invite emails; don't fail onboarding if they error
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      try {
        const { sendTeamInvite } = await import("@repo/email");
        await Promise.all(
          input.invites.map((to) =>
            sendTeamInvite({
              to,
              orgName: input.orgName,
              url: `${base}/login`,
            }).catch(() => undefined),
          ),
        );
      } catch {
        // email package unavailable; skip
      }

      return { orgId: org.id, invited: input.invites };
    }),
  finish: protectedProcedure.mutation(async ({ ctx }) => {
    await connectDB();
    await UserModel.findByIdAndUpdate(ctx.userId, { onboardingComplete: true });
    return { ok: true };
  }),
});
