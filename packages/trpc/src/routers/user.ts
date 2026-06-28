import { router, protectedProcedure } from "../trpc";
import { connectDB, UserModel } from "@repo/db";

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
    const u = await UserModel.findById(ctx.userId).lean();
    return (u as unknown as MeResult) ?? null;
  }),
});
