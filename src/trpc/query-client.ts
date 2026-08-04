/**
 * @file src/trpc/query-client.ts
 * @description Configures defaults for TanStack Query Client instances.
 * 
 * WHY IT'S NEEDED:
 * Standardizes caching parameters, dehydration guidelines, hydration formats, and staleTimes
 * across client and server environments.
 * 
 * FLOW OF EXECUTION:
 * 1. `createQueryClient()`: Returns a configured `QueryClient`.
 * 2. Sets a default `staleTime` of 30 seconds to prevent client components from immediately refetching
 *    data upon mount when using SSR.
 * 3. Utilizes `SuperJSON` serialization to format complex types like Dates and Maps across dehydrate/hydrate boundaries.
 * 
 * CONNECTIONS:
 * - Loaded by `src/trpc/react.tsx` (client singleton helper) and `src/trpc/server.ts` (React Server Component adapter).
 */

import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Set staleTime to 30s to prevent immediate refetching on mount after Server Side Rendering (SSR)
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

