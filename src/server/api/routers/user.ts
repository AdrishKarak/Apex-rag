import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  getUsers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany();
  }),
});
