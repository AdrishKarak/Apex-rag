import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import React from "react"
import { toast } from "sonner"

const useProject = () => {
    const [projectId, setProjectid] = useLocalStorage("APex-projectId", "")

    // Query projects with dynamic refetch interval
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
            prevIndexingRef.current = project.isIndexing;
        } else {
            prevIndexingRef.current = null;
        }
    }, [project?.isIndexing, project?.id, project?.name]);

    return { project, projects, projectId: project?.id ?? projectId, setProjectid }
}

export default useProject