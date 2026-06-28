import { router, protectedProcedure } from "../trpc";
import { connectDB, UserModel } from "@repo/db";

export const userRouter = router({
  getMe: protectedProcedure.query(async ({ ctx }) => {
    await connectDB();
    return UserModel.findById(ctx.userId).lean();
  }),
});
