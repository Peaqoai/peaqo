import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { connectDB, UserModel } from "@repo/db";
import { shouldResetCredits } from "../llm/resolve";

export type MeResult = {
  _id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: "free" | "pro" | "ultimate" | "team";
  role: "user" | "admin";
  onboardingComplete: boolean;
  creditsUsed: number;
  creditsLimit: number;
} | null;

export const userRouter = router({
  getMe: protectedProcedure.query(async ({ ctx }): Promise<MeResult> => {
    await connectDB();
    const u = (await UserModel.findById(ctx.userId)) as
      | ({ creditsResetAt?: Date; creditsUsed: number; save: () => Promise<unknown> } & Record<string, unknown>)
      | null;
    if (!u) return null;
    // lazy rolling reset: zero out usage once the 30-day window elapses
    if (shouldResetCredits(u.creditsResetAt)) {
      u.creditsUsed = 0;
      u.creditsResetAt = new Date();
      await u.save();
    }
    return JSON.parse(JSON.stringify(u)) as MeResult;
  }),

  // ponytail: data URL stored inline in Mongo — fine for small avatars; move to
  // object storage (R2/S3) if images get large or the user doc bloats
  setAvatar: protectedProcedure
    .input(z.object({ dataUrl: z.string().max(700_000).startsWith("data:image/") }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();
      await UserModel.updateOne({ _id: ctx.userId }, { avatarUrl: input.dataUrl });
      return { ok: true };
    }),
});
