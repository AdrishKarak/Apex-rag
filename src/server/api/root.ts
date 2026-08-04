/**
 * @file src/server/api/root.ts
 * @description Root tRPC Router aggregator.
 * 
 * WHY IT'S NEEDED:
 * Serves as the central registry where all domain-specific routers (user, project, etc.) are combined
 * and exported under a unified type structure.
 * 
 * FLOW OF EXECUTION:
 * 1. Combines `userRouter` and `projectRouter` under the namespaces `user` and `project`.
 * 2. Exports the combined type definition `AppRouter` for frontend consumption.
 * 3. Creates a server-side caller factory using `createCallerFactory` to facilitate direct programmatic
 *    calls to tRPC endpoints from React Server Components.
 * 
 * CONNECTIONS:
 * - Consumed by `src/app/api/trpc/[trpc]/route.ts` (API route adapter).
 * - Shared types are imported by `src/trpc/react.tsx` and `src/trpc/server.ts` to enforce compiler type checks.
 */

import { userRouter } from "@/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { projectRouter } from "./routers/project";

/**
 * Primary server router container combining all sub-routers.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  project: projectRouter,
});

// Export tRPC AppRouter type interface
export type AppRouter = typeof appRouter;

/**
 * Creates a server-side caller for direct Server Component integration.
 */
export const createCaller = createCallerFactory(appRouter);

