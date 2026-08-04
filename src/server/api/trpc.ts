/**
 * @file src/server/api/trpc.ts
 * @description Standardizes the backend tRPC API framework setup.
 * 
 * WHY IT'S NEEDED:
 * Configures the query contexts, initializes procedure mappings, and declares global middleware
 * (like Clerk session verification, sliding-window rate limit checks, and server timing logs).
 * 
 * FLOW OF EXECUTION:
 * 1. `createTRPCContext`: Parses inbound headers and database instances, formatting a shared context map.
 * 2. `isAuthenticated`: Checks the session token. Matches Clerk users to the local PostgreSQL database using
 *    a fast-path ID scan, falling back to a slow-path Clerk email match/sync when necessary.
 * 3. `timingMiddleware`: Logs processing times for procedures.
 * 4. `rateLimitMiddleware`: Dynamically configures sliding rate limits based on whether the action is a mutation or a query.
 * 
 * CONNECTIONS:
 * - Loaded by `src/app/api/trpc/[trpc]/route.ts` and `src/trpc/server.ts`.
 * - Provides `publicProcedure` and `protectedProcedure` bases for routers.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { rateLimiter } from "@/lib/rate-limit";

/**
 * Generates the "internals" for a tRPC context.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

// Initialize tRPC instance with SuperJSON transformer and a custom Zod validation error formatter
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

/**
 * Authentication check middleware.
 * Verifies Clerk JWT and handles matching or creation of user profile rows in the local database.
 */
const isAuthenticated = t.middleware(async ({ next, ctx }) => {
  const user = await auth();
  if (!user.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in',
    })
  }

  // Fast path: Check if user exists in local database by ID first (no Clerk API call)
  let dbUser = await ctx.db.user.findUnique({
    where: { id: user.userId },
  });

  if (!dbUser) {
    // Slow path: User is missing from local DB, fetch from Clerk and sync
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(user.userId);
    const emailAddress =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
          ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!emailAddress) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'User email not found in Clerk',
      });
    }

    dbUser = await ctx.db.user.findUnique({
      where: { emailAddress },
    });

    if (!dbUser) {
      // Create user record if not present
      dbUser = await ctx.db.user.create({
        data: {
          id: user.userId,
          emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
      });
    } else if (dbUser.id !== user.userId) {
      try {
        // Sync ID match
        dbUser = await ctx.db.user.update({
          where: { emailAddress },
          data: {
            id: user.userId,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
          },
        });
      } catch {
        // Fallback recreate
        await ctx.db.user.delete({
          where: { id: dbUser.id },
        });
        dbUser = await ctx.db.user.create({
          data: {
            id: user.userId,
            emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
          },
        });
      }
    }
  }

  return next({
    ctx: {
      ...ctx,
      user,
      dbUser,
    }
  })
})

/**
 * Timing middleware to log execution times and help identify query waterfall bottlenecks.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
  return result;
});

/**
 * Rate limit middleware checking client IP or authenticated userId hits.
 */
const rateLimitMiddleware = t.middleware(async ({ next, ctx, path, type }) => {
  const clientIp = ctx.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown-ip";
  const authUser = await auth();
  const identifier = authUser?.userId ? `user:${authUser.userId}` : `ip:${clientIp}`;
  
  // Stricter rate limits for mutations (15 req/min), standard for queries (120 req/min)
  const limit = type === "mutation" ? 15 : 120;
  const windowMs = 60 * 1000;

  const rateCheck = rateLimiter.check(`${identifier}:${path}`, limit, windowMs);
  if (!rateCheck.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded for ${path}. Please try again in ${Math.ceil(rateCheck.resetMs / 1000)} seconds.`,
    });
  }

  return next();
});

// Exports global API procedure schemas
export const publicProcedure = t.procedure.use(timingMiddleware).use(rateLimitMiddleware);
export const protectedProcedure = t.procedure.use(isAuthenticated).use(timingMiddleware).use(rateLimitMiddleware);


