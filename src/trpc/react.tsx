/**
 * @file src/trpc/react.tsx
 * @description Frontend tRPC client adapter configured for React and TanStack Query.
 * 
 * WHY IT'S NEEDED:
 * Standardizes browser API transactions, enabling components to invoke typed backend actions
 * directly without writing raw fetch handlers.
 * 
 * FLOW OF EXECUTION:
 * 1. `getQueryClient()`: Spawns a QueryClient. On the client side (browser), it returns a singleton instance
 *    to preserve memory state across component re-renders. On the server side (SSR), it always spawns a new client.
 * 2. `api.createClient()`: Builds the tRPC client mapping:
 *    - `loggerLink`: Logs queries/mutations to the console during development or when exceptions occur.
 *    - `httpBatchStreamLink`: Packages multiple concurrent queries into a single HTTP payload (using SuperJSON)
 *      and streams responses back to support Server-Sent-Events and stream values.
 * 3. `TRPCReactProvider`: Context wrapper binding the TanStack Query Client and the tRPC client to the React tree.
 * 
 * CONNECTIONS:
 * - Wraps the root layout (`src/app/layout.tsx`).
 * - Exposes the `api` hooks client utilized by all custom React Hooks and page components.
 */

"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import type { AppRouter } from "@/server/api/root";
import { createQueryClient } from "./query-client";

// Global cache variable to reference the client-side TanStack Query client singleton
let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client to avoid cross-request data leaks in SSR
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client and query cache
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

// Create the React-specific tRPC hooks client using the AppRouter type definitions
export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * tRPC React Context Provider component wrapping the application.
 */
export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // Create the tRPC client instance inside state to avoid recreating it on re-renders
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        // Log transactions to console in development
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        // Batch multiple operations and stream outputs using SuperJSON serialization
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

/**
 * Resolves the base url domain string based on runtime environments.
 */
function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

