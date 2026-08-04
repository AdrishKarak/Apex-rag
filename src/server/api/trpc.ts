/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { rateLimiter } from "@/lib/rate-limit";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
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

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
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

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

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

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware).use(rateLimitMiddleware);
export const protectedProcedure = t.procedure.use(isAuthenticated).use(timingMiddleware).use(rateLimitMiddleware);

