/**
 * @file src/server/api/routers/user.ts
 * @description tRPC Router managing user accounting, transaction history, and credit balances.
 * 
 * WHY IT'S NEEDED:
 * Houses API endpoints allowing users to query active balances, purchase tokens, and enforce sliding transaction limits.
 * 
 * FLOW OF EXECUTION:
 * 1. `getUsers`: Fetches all user listings (public).
 * 2. `getMyCredits`:
 *    - Fetches the active credit count for the authenticated user.
 *    - Runs a query checking for credit transactions that occurred in the last hour.
 *    - Imposes a rolling purchase ceiling of 1,000 credits per 1-hour window.
 *    - Calculates the reset interval time remaining based on the oldest transaction in the current window.
 * 3. `buyCredits(amount)`:
 *    - Validates that the requested purchase amount lies between 100 and 1,000.
 *    - Checks recent transactions to ensure the new purchase won't exceed the rolling 1-hour ceiling.
 *    - Runs a transactional query (`$transaction`) updating user credits and logging a `CreditTransaction` entry.
 * 
 * CONNECTIONS:
 * - Invoked by client components on the Billing and Dashboard pages.
 */

import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  /**
   * Public route returning all registered users.
   */
  getUsers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany();
  }),

  /**
   * Protected query returning detailed credit accounting data for the active user session.
   */
  getMyCredits: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.userId! }
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Determine the boundary timestamp for the rolling 1-hour window
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Retrieve transactions executed by the user within the rolling window
    const recentTransactions = await ctx.db.creditTransaction.findMany({
      where: {
        userId: ctx.user.userId!,
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    // Calculate total credits purchased within the rolling window
    const purchasedInWindow = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const maxPerWindow = 1000;
    const remainingInWindow = Math.max(0, maxPerWindow - purchasedInWindow);

    // Calculate the remaining time until the oldest transaction slides out of the rolling window
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

  /**
   * Protected mutation to purchase credits.
   * Restricts updates using a rolling 1-hour window ceiling.
   */
  buyCredits: protectedProcedure.input(
    z.object({
      amount: z.number().min(100).max(1000)
    })
  ).mutation(async ({ ctx, input }) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Fetch credits purchased during the rolling window
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

    // Check if the purchase exceeds the rolling limit
    if (purchasedInWindow + input.amount > maxPerWindow) {
      const remaining = Math.max(0, maxPerWindow - purchasedInWindow);
      const oldestTx = recentTransactions.reduce((min, tx) => tx.createdAt < min.createdAt ? tx : min, recentTransactions[0]!);
      const resetMinutes = Math.ceil((oldestTx.createdAt.getTime() + 60 * 60 * 1000 - Date.now()) / 60000);

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Limit Exceeded: You can only buy up to 1,000 credits per 1 hour. You have already bought ${purchasedInWindow} credits in the current window. You can only buy up to ${remaining} more credits right now, or wait ~${resetMinutes} minute(s).`
      });
    }

    // Perform the purchase inside a database transaction to ensure atomicity
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

