import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  getUsers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany();
  }),

  getMyCredits: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.userId! }
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentTransactions = await ctx.db.creditTransaction.findMany({
      where: {
        userId: ctx.user.userId!,
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    const purchasedInWindow = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const maxPerWindow = 1000;
    const remainingInWindow = Math.max(0, maxPerWindow - purchasedInWindow);

    // Calculate time until oldest transaction in window expires
    let nextResetInSeconds = 0;
    if (recentTransactions.length > 0) {
      const oldestTx = recentTransactions.reduce((min, tx) => tx.createdAt < min.createdAt ? tx : min, recentTransactions[0]!);
      const resetTime = new Date(oldestTx.createdAt.getTime() + 60 * 60 * 1000);
      nextResetInSeconds = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
    }

    return {
      credits: user.credits,
      purchasedInWindow,
      maxPerWindow,
      remainingInWindow,
      nextResetInSeconds,
      recentTransactions
    };
  }),

  buyCredits: protectedProcedure.input(
    z.object({
      amount: z.number().min(100).max(1000)
    })
  ).mutation(async ({ ctx, input }) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentTransactions = await ctx.db.creditTransaction.findMany({
      where: {
        userId: ctx.user.userId!,
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    const purchasedInWindow = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const maxPerWindow = 1000;

    if (purchasedInWindow + input.amount > maxPerWindow) {
      const remaining = Math.max(0, maxPerWindow - purchasedInWindow);
      const oldestTx = recentTransactions.reduce((min, tx) => tx.createdAt < min.createdAt ? tx : min, recentTransactions[0]!);
      const resetMinutes = Math.ceil((oldestTx.createdAt.getTime() + 60 * 60 * 1000 - Date.now()) / 60000);

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Limit Exceeded: You can only buy up to 1,000 credits per 1 hour. You have already bought ${purchasedInWindow} credits in the current window. You can only buy up to ${remaining} more credits right now, or wait ~${resetMinutes} minute(s).`
      });
    }

    // Perform purchase: update user credits & record transaction
    const [updatedUser] = await ctx.db.$transaction([
      ctx.db.user.update({
        where: { id: ctx.user.userId! },
        data: {
          credits: {
            increment: input.amount
          }
        }
      }),
      ctx.db.creditTransaction.create({
        data: {
          userId: ctx.user.userId!,
          amount: input.amount
        }
      })
    ]);

    return {
      success: true,
      credits: updatedUser.credits
    };
  }),
});
