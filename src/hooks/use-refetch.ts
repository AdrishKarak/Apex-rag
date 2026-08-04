/**
 * @file src/hooks/use-refetch.ts
 * @description Hook that returns an invalidation callback triggering TanStack query refetches.
 * 
 * WHY IT'S NEEDED:
 * Simplifies manual refreshes of state variables throughout dashboard panels after asynchronous mutations complete.
 * 
 * FLOW OF EXECUTION:
 * 1. Resolves the active `QueryClient` context.
 * 2. Returns an async function which calls `queryClient.refetchQueries({ type: 'active' })`.
 * 
 * CONNECTIONS:
 * - Employed inside commit panels to refresh timelines after sync operations.
 */

import { useQueryClient } from "@tanstack/react-query"

const userefetch = () => {
    const queryClient = useQueryClient()
    return async () => {
        // Refetch all active queries registered in the QueryClient cache
        await queryClient.refetchQueries({
            type: "active"
        })
    }
}

export default userefetch

