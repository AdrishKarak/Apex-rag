/**
 * @file src/trpc/server.ts
 * @description Server-side tRPC caller adapter designed for React Server Components (RSC).
 * 
 * WHY IT'S NEEDED:
 * Enables React Server Components to fetch data from tRPC routers directly on the server
 * without making redundant HTTP roundtrips.
 * 
 * FLOW OF EXECUTION:
 * 1. `createContext()`: Wraps standard context generation, extracting incoming request headers and tag routing metrics.
 * 2. `caller`: Instantiates the AppRouter caller using `createCaller` with the server context.
 * 3. `HydrateClient` / `api`: Exposes the hydration helpers used to prefetch query states on the server and dehydrate them to the browser client.
 * 
 * CONNECTIONS:
 * - Imported by Server Components inside `src/app/*` (e.g. initial page loads).
 */

import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";

import { createCaller, type AppRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { createQueryClient } from "./query-client";

/**
 * Creates context properties for React Server Components.
 * Wrapped in React's `cache` to reuse the same context across multiple components in a single request.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

// Cache the query client instance per request thread
const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

// Export the RSC client interface and hydration helper wrapper
export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);

