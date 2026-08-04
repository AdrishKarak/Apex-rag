/**
 * @file src/hooks/use-project.ts
 * @description React state hook designed to resolve the active project and manage auto-polling synchronization.
 * 
 * WHY IT'S NEEDED:
 * Automatically triggers background fetch polling intervals when a linked repository is actively indexing code.
 * Pushes client toast status notifications when background vectorization indexing finishes.
 * 
 * FLOW OF EXECUTION:
 * 1. Checks `localStorage` for the active `"APex-projectId"`.
 * 2. Runs the tRPC `getProjects` query to fetch all projects.
 * 3. Configures a custom `refetchInterval`: if the currently selected project has `isIndexing === true`,
 *    it queries project state every 3 seconds (3000ms), otherwise it stays disabled.
 * 4. Tracks indexing state transitions from true -> false using `prevIndexingRef`.
 * 5. Triggers a toast success alert upon indexing completion.
 * 
 * CONNECTIONS:
 * - Consumed by sidebar panels and main dashboard pages.
 */

import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import React from "react"
import { toast } from "sonner"

const useProject = () => {
    // 1. Keep track of selected project ID in localStorage
    const [projectId, setProjectid] = useLocalStorage("APex-projectId", "")

    // 2. Query projects with dynamic refetch interval
    const { data: projects } = api.project.getProjects.useQuery(
        undefined,
        {
            // If the selected project is indexing, poll every 3 seconds to check for updates
            refetchInterval: (query) => {
                const projectsList = query.state.data;
                const activeProject = projectsList?.find((p: any) => p.id === projectId) ?? projectsList?.[0];
                return activeProject?.isIndexing ? 3000 : false;
            }
        }
    )

    // Fallback to the first project in the list if the cached ID doesn't exist
    const project = projects?.find(project => project.id === projectId) ?? projects?.[0]

    // Track the indexing state to trigger toast notifications when indexing completes
    const prevIndexingRef = React.useRef<boolean | null>(null);

    React.useEffect(() => {
        if (project) {
            // When it transitions from indexing (true) to completed (false), trigger toast feedback
            if (prevIndexingRef.current === true && project.isIndexing === false) {
                toast.success(`Repository "${project.name}" has been fully indexed! AI search is now active.`, {
                    duration: 5000
                });
            }
            // Update ref with current status
            prevIndexingRef.current = project.isIndexing;
        } else {
            prevIndexingRef.current = null;
        }
    }, [project?.isIndexing, project?.id, project?.name]);

    return { project, projects, projectId: project?.id ?? projectId, setProjectid }
}

export default useProject