import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { connectDB, ConversationModel, UserModel, PersonaModel, CharacterModel } from "@repo/db";
import { adminCharacterRouter, personaShape, characterShape } from "./character";

// platform-wide counts for the admin dashboard
const stats = adminProcedure.query(async () => {
  await connectDB();
  const [users, chats] = await Promise.all([
    UserModel.countDocuments(),
    ConversationModel.countDocuments(),
  ]);
  return { users, chats };
});

const pageInput = z.object({
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(""),
});

const users = router({
  // server-side paginated + filtered user list for the admin table
  list: adminProcedure
    .input(
      pageInput.extend({
        plan: z.enum(["free", "pro", "ultimate", "team"]).optional(),
        role: z.enum(["user", "admin"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      await connectDB();
      const filter: Record<string, unknown> = {};
      if (input.search) {
        const rx = { $regex: input.search, $options: "i" };
        filter.$or = [{ name: rx }, { email: rx }];
      }
      if (input.plan) filter.plan = input.plan;
      if (input.role) filter.role = input.role;

      const [rows, total] = await Promise.all([
        UserModel.find(filter)
          .select("name email avatarUrl plan role creditsUsed creditsLimit createdAt")
          .sort({ createdAt: -1 })
          .skip(input.page * input.pageSize)
          .limit(input.pageSize)
          .lean(),
        UserModel.countDocuments(filter),
      ]);
      return { rows: JSON.parse(JSON.stringify(rows)), total };
    }),

  // manual credit reset for an account (auto reset is a 30-day rolling window)
  resetCredits: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      await UserModel.updateOne(
        { _id: input.userId },
        { creditsUsed: 0, creditsResetAt: new Date() },
      );
      return { ok: true };
    }),
});

// global persona / character CRUD (each writes scope:"global" to its collection)
const personas = adminCharacterRouter(PersonaModel, personaShape);
const characters = adminCharacterRouter(CharacterModel, characterShape);

export const adminRouter = router({ users, stats, personas, characters });
